import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const BUCKET = "partner-documents";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const norm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, " ").trim();
const digits = (s: string) => (s || "").replace(/\D/g, "");

function addressScore(a: string, b: string) {
  const A = new Set(norm(a).split(" ").filter((w) => w.length > 2));
  const B = new Set(norm(b).split(" ").filter((w) => w.length > 2));
  if (!A.size || !B.size) return 0;
  let hit = 0;
  A.forEach((w) => { if (B.has(w)) hit++; });
  return hit / Math.min(A.size, B.size);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const { data: userRes, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userRes?.user) return json({ error: "Unauthorized" }, 401);
    const user = userRes.user;

    const body = await req.json().catch(() => null);
    if (!body) return json({ error: "Invalid body" }, 400);

    const { front_path, back_path, selfie_path, cnic, full_name, address, application_id } = body as Record<string, string>;
    if (!front_path || !back_path || !selfie_path) return json({ error: "تینوں تصاویر لازمی ہیں" }, 400);
    const cnicDigits = digits(cnic);
    if (cnicDigits.length !== 13) return json({ error: "شناختی کارڈ نمبر 13 ہندسوں کا ہونا چاہیے" }, 400);
    if (!full_name || !address) return json({ error: "نام اور پتہ لازمی ہے" }, 400);

    // Duplicate CNIC guard (another user already verified/pending with this CNIC)
    const { data: dup } = await admin
      .from("rider_verifications")
      .select("id,user_id,status")
      .eq("cnic_number", cnicDigits)
      .neq("status", "rejected")
      .maybeSingle();
    if (dup && dup.user_id !== user.id) {
      return json({ error: "یہ شناختی کارڈ پہلے ہی کسی رائیڈر کے نام رجسٹرڈ ہے" }, 409);
    }

    const signed = await Promise.all(
      [front_path, back_path, selfie_path].map((p) =>
        admin.storage.from(BUCKET).createSignedUrl(p, 900)
      )
    );
    if (signed.some((s) => s.error || !s.data?.signedUrl)) {
      return json({ error: "تصاویر پڑھی نہیں جا سکیں" }, 400);
    }
    const [frontUrl, backUrl, selfieUrl] = signed.map((s) => s.data!.signedUrl);

    const prompt = `You are a strict KYC verification officer for a Pakistani delivery platform.
Image 1 = front of a Pakistani CNIC. Image 2 = back of the same CNIC. Image 3 = live selfie of the applicant.

Return STRICT JSON only, no markdown:
{
 "front_is_cnic_front": boolean,
 "back_is_cnic_back": boolean,
 "cnic_number": "13 digits found on card or empty",
 "name_on_card": "",
 "father_name": "",
 "date_of_birth": "YYYY-MM-DD or empty",
 "expiry_date": "YYYY-MM-DD or empty",
 "address_on_card": "both present (موجودہ پتہ) and permanent (مستقل پتہ) addresses from back of card, transliterated to English letters",
 "declared_address_matches_card": boolean,
 "face_match_confidence": 0-100,
 "selfie_is_live_person": boolean,
 "selfie_is_photo_of_screen_or_printout": boolean,
 "selfie_looks_like_stock_or_celebrity": boolean,
 "document_tampering_suspected": boolean,
 "image_quality_ok": boolean,
 "notes": "short reason in Urdu"
}
Compare the photo printed on the CNIC front with the selfie for face_match_confidence.
Be conservative: if the selfie appears to be a photo taken of another photo/screen, set selfie_is_photo_of_screen_or_printout true.
The applicant typed this address (may be English/Roman Urdu while the card is in Urdu script): "${String(address).slice(0, 300).replace(/"/g, "'")}".
Set declared_address_matches_card true if it refers to the same place as EITHER the present OR the permanent address on the card (same mohallah/area/town/landmark), ignoring language, spelling and word order.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-3.7-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: frontUrl } },
              { type: "image_url", image_url: { url: backUrl } },
              { type: "image_url", image_url: { url: selfieUrl } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (aiRes.status === 429) return json({ error: "بہت زیادہ درخواستیں — تھوڑی دیر بعد کوشش کریں" }, 429);
    if (aiRes.status === 402) return json({ error: "AI کریڈٹس ختم ہو گئے، ایڈمن سے رابطہ کریں" }, 402);
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI error", aiRes.status, t);
      return json({ error: "تصدیق سروس دستیاب نہیں" }, 502);
    }

    const aiJson = await aiRes.json();
    let checks: Record<string, unknown> = {};
    try {
      checks = JSON.parse(aiJson.choices?.[0]?.message?.content ?? "{}");
    } catch {
      checks = {};
    }

    const cardCnic = digits(String(checks.cnic_number ?? ""));
    const expiryStr = String(checks.expiry_date ?? "");
    const expiryDate = /^\d{4}-\d{2}-\d{2}$/.test(expiryStr) ? expiryStr : null;
    const faceConf = Number(checks.face_match_confidence ?? 0);

    const cnic_match = cardCnic.length === 13 && cardCnic === cnicDigits;
    const expiry_valid = !!expiryDate && new Date(expiryDate) > new Date();
    const face_match = faceConf >= 75;
    const liveness_ok =
      checks.selfie_is_live_person === true &&
      checks.selfie_is_photo_of_screen_or_printout !== true &&
      checks.selfie_looks_like_stock_or_celebrity !== true;
    const addrScore = addressScore(String(checks.address_on_card ?? ""), address);
    const address_match = addrScore >= 0.4 || checks.declared_address_matches_card === true;
    const docsOk =
      checks.front_is_cnic_front === true &&
      checks.back_is_cnic_back === true &&
      checks.document_tampering_suspected !== true;

    const nameScore = addressScore(String(checks.name_on_card ?? ""), full_name);

    const passed = [cnic_match, expiry_valid, face_match, liveness_ok, address_match, docsOk, nameScore >= 0.5];
    const score = Math.round((passed.filter(Boolean).length / passed.length) * 100);

    const hardFail = !docsOk || !cnic_match || !liveness_ok || !face_match || !expiry_valid;
    const status = hardFail ? "failed" : score >= 90 ? "verified" : "manual_review";

    const reasons: string[] = [];
    if (!docsOk) reasons.push("شناختی کارڈ کی تصاویر درست/اصل نہیں لگتیں");
    if (!cnic_match) reasons.push("کارڈ پر لکھا نمبر درج کردہ نمبر سے میل نہیں کھاتا");
    if (!expiry_valid) reasons.push("شناختی کارڈ کی میعاد ختم ہو چکی ہے یا تاریخ پڑھی نہیں گئی");
    if (!face_match) reasons.push("سیلفی کارڈ کی تصویر سے میل نہیں کھاتی");
    if (!liveness_ok) reasons.push("سیلفی لائیو نہیں لگتی (اسکرین/پرنٹ کی تصویر)");
    if (!address_match) reasons.push("درج کردہ پتہ کارڈ کے پتے سے میل نہیں کھاتا");
    if (nameScore < 0.5) reasons.push("نام کارڈ سے میل نہیں کھاتا");

    const row = {
      user_id: user.id,
      application_id: application_id || null,
      cnic_number: cnicDigits,
      cnic_expiry: expiryDate,
      cnic_name: String(checks.name_on_card ?? ""),
      cnic_address: String(checks.address_on_card ?? ""),
      declared_name: full_name,
      declared_address: address,
      front_url: front_path,
      back_url: back_path,
      selfie_url: selfie_path,
      face_match,
      liveness_ok,
      address_match,
      expiry_valid,
      cnic_match,
      ai_score: score,
      ai_checks: { ...checks, address_similarity: addrScore, name_similarity: nameScore },
      failure_reason: reasons.join("، ") || null,
      status,
      updated_at: new Date().toISOString(),
    };

    const { error: upErr } = await admin
      .from("rider_verifications")
      .upsert(row, { onConflict: "user_id" });
    if (upErr) {
      console.error("upsert error", upErr);
      if (upErr.code === "23505") return json({ error: "یہ شناختی کارڈ پہلے سے رجسٹرڈ ہے" }, 409);
      return json({ error: "ریکارڈ محفوظ نہیں ہو سکا" }, 500);
    }

    return json({
      status,
      score,
      reasons,
      expiry: expiryDate,
      checks: {
        cnic_match,
        expiry_valid,
        face_match,
        liveness_ok,
        address_match,
        documents_ok: docsOk,
      },
    });
  } catch (e) {
    console.error(e);
    return json({ error: "غیر متوقع خرابی" }, 500);
  }
});
