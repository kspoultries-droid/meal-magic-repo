// Reads a rider's deposit slip with a cheap vision model and stores red/green flags for staff.
// Never approves anything: staff still decide through review_rider_remittance.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const MODEL = "google/gemini-3.1-flash-lite";
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const digits = (s: unknown) => String(s ?? "").replace(/\D/g, "");
const schema = {
  type: "object", additionalProperties: false,
  required: ["is_receipt", "amount", "reference", "recipient_account", "recipient_name", "paid_at"],
  properties: {
    is_receipt: { type: "boolean" }, amount: { type: "number" }, reference: { type: "string" },
    recipient_account: { type: "string" }, recipient_name: { type: "string" }, paid_at: { type: "string" },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "لاگ اِن کریں" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const uc = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await uc.auth.getUser();
    if (!user) return json({ error: "لاگ اِن کریں" }, 401);
    const p = z.object({ id: z.string().uuid() }).safeParse(await req.json().catch(() => ({})));
    if (!p.success) return json({ error: "غلط درخواست" }, 400);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: row } = await admin.from("rider_remittances").select("*").eq("id", p.data.id).maybeSingle();
    if (!row) return json({ error: "ریکارڈ نہیں ملا" }, 404);
    const { data: staff } = await admin.rpc("is_staff", { _user_id: user.id });
    if (row.rider_id !== user.id && !staff) return json({ error: "اجازت نہیں" }, 403);
    if (row.status !== "pending") return json({ check: row.slip_check });
    if (row.slip_check && !staff) return json({ check: row.slip_check });

    const flags: string[] = [];
    // duplicate reference / identical receipt from any rider
    const { count: dup } = await admin.from("rider_remittances").select("id", { count: "exact", head: true })
      .neq("id", row.id).neq("status", "rejected").ilike("reference_no", row.reference_no ?? "");
    if ((dup ?? 0) > 0) flags.push("duplicate_reference");

    const file = await admin.storage.from("partner-documents").download(row.receipt_url);
    if (file.error || !file.data) {
      flags.push("receipt_unreadable");
      const check = { status: "red", flags, checked_at: new Date().toISOString() };
      await admin.from("rider_remittances").update({ slip_check: check }).eq("id", row.id);
      return json({ check });
    }
    const buf = new Uint8Array(await file.data.arrayBuffer());
    if (buf.length > 6_000_000) flags.push("receipt_too_large");
    const mime = file.data.type?.startsWith("image/") ? file.data.type : "image/jpeg";
    let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    const dataUrl = `data:${mime};base64,${btoa(bin)}`;

    let ex: any = null;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (apiKey && buf.length <= 6_000_000) {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}`, "X-Lovable-AIG-SDK": "fetch" },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: "You read Pakistani payment receipts (Easypaisa, JazzCash, bank apps, IBFT). Extract exactly what is printed. is_receipt=false if the image is not a real payment receipt. amount in PKR as number (0 if unreadable). reference = transaction/TID/Trx ID exactly. recipient_account = receiving account/mobile/IBAN digits as printed (may be masked). recipient_name = receiver name. paid_at = date/time as ISO 8601 if readable else empty." },
            { role: "user", content: [{ type: "text", text: "Extract this receipt." }, { type: "image_url", image_url: { url: dataUrl } }] },
          ],
          response_format: { type: "json_schema", json_schema: { name: "receipt", strict: true, schema } },
        }),
      });
      if (res.ok) {
        const d = await res.json();
        try { ex = JSON.parse(d?.choices?.[0]?.message?.content ?? "null"); } catch { ex = null; }
      }
    }

    if (!ex) flags.push("ai_unavailable");
    else {
      if (!ex.is_receipt) flags.push("not_a_receipt");
      if (Math.abs(Number(ex.amount || 0) - Number(row.amount)) > 1) flags.push("amount_mismatch");
      const rr = digits(ex.reference), ref = digits(row.reference_no);
      const refText = String(ex.reference || "").toUpperCase().replace(/\s/g, "");
      if (!refText || (refText !== row.reference_no && !(rr && ref && rr === ref))) flags.push("reference_mismatch");
      const { data: acc } = await admin.from("payment_accounts").select("account_number,account_title").eq("id", row.account_id).maybeSingle();
      const want = digits(acc?.account_number), got = digits(ex.recipient_account);
      // receipts often mask digits: compare the last 4 visible digits
      if (want && (!got || got.slice(-4) !== want.slice(-4))) flags.push("account_mismatch");
      if (ex.paid_at) {
        const t = Date.parse(ex.paid_at);
        if (!isNaN(t) && (Date.now() - t > 3 * 86400_000 || t - Date.parse(row.created_at) > 3600_000)) flags.push("date_suspicious");
      }
    }
    const red = flags.some((f) => f !== "ai_unavailable" && f !== "date_suspicious");
    const check = { status: red ? "red" : flags.length ? "amber" : "green", flags, extracted: ex, checked_at: new Date().toISOString() };
    await admin.from("rider_remittances").update({ slip_check: check }).eq("id", row.id);
    return json({ check });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
