// Turns a menu/price-list photo or spoken/typed Urdu text into a draft item list.
// Cheap model, one call per button press, per-user daily limit. Never saves anything itself.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const DAILY_LIMIT = 10;
const PRODUCT_DAILY_LIMIT = 40;
const MODEL = "google/gemini-3.1-flash-lite";
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const PROMPTS: Record<string, string> = {
  menu: "You read restaurant menus from Pakistan (Urdu/English/Roman Urdu). Extract every dish with price in PKR. Category examples: BBQ, Karahi, Biryani & Rice, Fast Food, Drinks, Desserts, Breakfast. Write a short appetising English description (max 12 words). Give name in English and Urdu.",
  grocery: "You read grocery/wholesale price lists or bills from Pakistan. Extract each product with price in PKR, unit (e.g. 1kg, 500g, 1L, dozen). Category examples: Atta & Rice, Oil & Ghee, Dal, Spices, Dairy, Beverages, Snacks, Cleaning. Short English description. Give name in English and Urdu.",
  service: "A Pakistani worker (mechanic, plumber, electrician, AC technician, labourer) describes his work in Urdu. Produce a professional list of the services he offers, each with a fair typical Rahim Yar Khan visit price in PKR (0 if unknown), category, and a short English description. Give name in English and Urdu. Also summary = a 2 sentence professional profile in Urdu.",
};

const PRODUCT_PROMPT = "You look at ONE photo of a product sold in Pakistan and prepare a professional marketplace listing. Read only what is visible on the pack/label or clearly identifiable: brand, product name, variant/flavour, pack size. NEVER invent specifications you cannot see or reliably know for that exact model; leave a spec empty rather than guess. Choose category ONLY from the allowed list. For mobiles give RAM, storage, battery, screen, camera if printed or certain for that exact model; for electronics give model, power, voltage, in-box items; for clothes/shoes material, sizes, colours; for packed food pack weight, ingredients highlights, origin. description: 2 short factual English sentences, no hype words like best/100%/guaranteed. name_ur: Urdu script. barcode: digits if a barcode number is printed and readable, else empty. photo_ok=false if the photo is blurry, dark, a screenshot, a poster/advert, shows several different products, or not a real product; photo_issue explains in simple Urdu.";

const productSchema = {
  type: "object", additionalProperties: false,
  required: ["name", "name_ur", "brand", "category", "unit", "description", "barcode", "specs", "photo_ok", "photo_issue"],
  properties: {
    name: { type: "string" }, name_ur: { type: "string" }, brand: { type: "string" }, category: { type: "string" },
    unit: { type: "string" }, description: { type: "string" }, barcode: { type: "string" },
    specs: { type: "array", items: { type: "object", additionalProperties: false, required: ["label", "value"], properties: { label: { type: "string" }, value: { type: "string" } } } },
    photo_ok: { type: "boolean" }, photo_issue: { type: "string" },
  },
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

    const { kind, imageDataUrl, text, categories } = await req.json();
    const isProduct = kind === "product";
    if (!PROMPTS[kind] && !isProduct) return json({ error: "غلط درخواست" }, 400);
    if (isProduct && !(typeof imageDataUrl === "string" && imageDataUrl.startsWith("data:image/"))) return json({ error: "پروڈکٹ کی تصویر دیں" }, 400);
    const allowed = Array.isArray(categories) ? categories.filter((c: unknown) => typeof c === "string").slice(0, 60).map((c: string) => c.slice(0, 40)) : [];
    const hasImage = typeof imageDataUrl === "string" && imageDataUrl.startsWith("data:image/");
    const cleanText = typeof text === "string" ? text.trim().slice(0, 2000) : "";
    if (!hasImage && cleanText.length < 3) return json({ error: "تصویر دیں یا کچھ لکھیں / بولیں" }, 400);
    if (hasImage && imageDataUrl.length > 6_000_000) return json({ error: "تصویر بہت بڑی ہے" }, 400);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count } = await admin.from("ai_setup_usage").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).gte("created_at", since)[isProduct ? "eq" : "neq"]("kind", "product");
    const limit = isProduct ? PRODUCT_DAILY_LIMIT : DAILY_LIMIT;
    if ((count ?? 0) >= limit) return json({ error: `آج کی حد (${limit} بار) پوری ہو گئی، کل دوبارہ کوشش کریں` }, 429);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "AI سروس دستیاب نہیں" }, 500);

    const content: unknown[] = [{ type: "text", text: cleanText || (isProduct ? "Prepare the listing for this product." : "Extract all items from this image.") }];
    if (hasImage) content.push({ type: "image_url", image_url: { url: imageDataUrl } });

    await admin.from("ai_setup_usage").insert({ user_id: user.id, kind });
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}`, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: MODEL,
        messages: isProduct
          ? [{ role: "system", content: PRODUCT_PROMPT + (allowed.length ? ` Allowed categories: ${allowed.join(", ")}.` : "") }, { role: "user", content }]
          : [{ role: "system", content: PROMPTS[kind] + " Return at most 60 items. If nothing usable, return empty items." }, { role: "user", content }],
        response_format: isProduct
          ? { type: "json_schema", json_schema: { name: "product", strict: true, schema: productSchema } }
          : { type: "json_schema", json_schema: { name: "items", strict: true, schema } },
      }),
    });
    if (!res.ok) {
      const status = res.status === 402 || res.status === 429 ? res.status : 502;
      return json({ error: status === 402 ? "AI بیلنس ختم، ایڈمن سے رابطہ کریں" : "AI ابھی مصروف ہے، تھوڑی دیر بعد کوشش کریں" }, status);
    }
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));
    if (isProduct) {
      if (allowed.length && !allowed.includes(parsed.category)) parsed.category = allowed.includes("General") ? "General" : allowed[0];
      return json({ product: parsed, remaining: limit - (count ?? 0) - 1 });
    }
    return json({ items: parsed.items ?? [], summary: parsed.summary ?? "", remaining: DAILY_LIMIT - (count ?? 0) - 1 });
  } catch (e) {
    console.error(e);
    return json({ error: "کچھ غلط ہو گیا، دوبارہ کوشش کریں" }, 500);
  }
});
