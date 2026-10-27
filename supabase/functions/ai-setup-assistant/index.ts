// Turns a menu/price-list photo or spoken/typed Urdu text into a draft item list.
// Cheap model, one call per button press, per-user daily limit. Never saves anything itself.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const DAILY_LIMIT = 10;
const MODEL = "google/gemini-3.1-flash-lite";
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const PROMPTS: Record<string, string> = {
  menu: "You read restaurant menus from Pakistan (Urdu/English/Roman Urdu). Extract every dish with price in PKR. Category examples: BBQ, Karahi, Biryani & Rice, Fast Food, Drinks, Desserts, Breakfast. Write a short appetising English description (max 12 words). Give name in English and Urdu.",
  grocery: "You read grocery/wholesale price lists or bills from Pakistan. Extract each product with price in PKR, unit (e.g. 1kg, 500g, 1L, dozen). Category examples: Atta & Rice, Oil & Ghee, Dal, Spices, Dairy, Beverages, Snacks, Cleaning. Short English description. Give name in English and Urdu.",
  service: "A Pakistani worker (mechanic, plumber, electrician, AC technician, labourer) describes his work in Urdu. Produce a professional list of the services he offers, each with a fair typical Rahim Yar Khan visit price in PKR (0 if unknown), category, and a short English description. Give name in English and Urdu. Also summary = a 2 sentence professional profile in Urdu.",
};

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["items", "summary"],
  properties: {
    summary: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "name_ur", "price", "unit", "category", "description"],
        properties: {
          name: { type: "string" }, name_ur: { type: "string" }, price: { type: "number" },
          unit: { type: "string" }, category: { type: "string" }, description: { type: "string" },
        },
      },
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "پہلے لاگ اِن کریں" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "پہلے لاگ اِن کریں" }, 401);

    const { kind, imageDataUrl, text } = await req.json();
    if (!PROMPTS[kind]) return json({ error: "غلط درخواست" }, 400);
    const hasImage = typeof imageDataUrl === "string" && imageDataUrl.startsWith("data:image/");
    const cleanText = typeof text === "string" ? text.trim().slice(0, 2000) : "";
    if (!hasImage && cleanText.length < 3) return json({ error: "تصویر دیں یا کچھ لکھیں / بولیں" }, 400);
    if (hasImage && imageDataUrl.length > 6_000_000) return json({ error: "تصویر بہت بڑی ہے" }, 400);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count } = await admin.from("ai_setup_usage").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).gte("created_at", since);
    if ((count ?? 0) >= DAILY_LIMIT) return json({ error: `آج کی حد (${DAILY_LIMIT} بار) پوری ہو گئی، کل دوبارہ کوشش کریں` }, 429);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "AI سروس دستیاب نہیں" }, 500);

    const content: unknown[] = [{ type: "text", text: cleanText || "Extract all items from this image." }];
    if (hasImage) content.push({ type: "image_url", image_url: { url: imageDataUrl } });

    await admin.from("ai_setup_usage").insert({ user_id: user.id, kind });
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}`, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: PROMPTS[kind] + " Return at most 60 items. If nothing usable, return empty items." },
          { role: "user", content },
        ],
        response_format: { type: "json_schema", json_schema: { name: "items", strict: true, schema } },
      }),
    });
    if (!res.ok) {
      const status = res.status === 402 || res.status === 429 ? res.status : 502;
      return json({ error: status === 402 ? "AI بیلنس ختم، ایڈمن سے رابطہ کریں" : "AI ابھی مصروف ہے، تھوڑی دیر بعد کوشش کریں" }, status);
    }
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));
    return json({ items: parsed.items ?? [], summary: parsed.summary ?? "", remaining: DAILY_LIMIT - (count ?? 0) - 1 });
  } catch (e) {
    console.error(e);
    return json({ error: "کچھ غلط ہو گیا، دوبارہ کوشش کریں" }, 500);
  }
});
