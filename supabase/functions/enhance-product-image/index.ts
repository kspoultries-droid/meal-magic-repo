// Background cleanup for shopkeeper product photos.
// The product itself is never changed or re-imagined — only the background
// behind it is replaced with clean studio white.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROMPT = [
  "Keep the product in this photo EXACTLY as it is: same object, same shape, same colours,",
  "same text, same labels, same quantity, same angle. Do not redraw, replace, beautify or",
  "invent any part of the product. Only remove the messy background behind it and replace it",
  "with a clean, evenly lit pure white studio background with a soft natural shadow under the",
  "product. Keep the product centred and fully inside the frame.",
].join(" ");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Require a signed-in user — this endpoint spends paid AI credits.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "پہلے لاگ اِن کریں" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "پہلے لاگ اِن کریں" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI سروس دستیاب نہیں" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imageDataUrl } = await req.json();
    if (typeof imageDataUrl !== "string" || !imageDataUrl.startsWith("data:image/")) {
      return new Response(JSON.stringify({ error: "درست تصویر بھیجیں" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image",
        modalities: ["image", "text"],
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              { type: "image_url", image_url: { url: imageDataUrl } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("AI gateway error", res.status, detail);
      const message =
        res.status === 429
          ? "ابھی درخواستیں زیادہ ہیں، تھوڑی دیر بعد کوشش کریں"
          : res.status === 402
            ? "AI کریڈٹ ختم ہو گئے ہیں — ورک اسپیس میں کریڈٹ شامل کریں"
            : "پس منظر صاف نہیں ہو سکا";
      return new Response(JSON.stringify({ error: message }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const image = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!image) {
      return new Response(JSON.stringify({ error: "پس منظر صاف نہیں ہو سکا" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ image }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("enhance-product-image failed", error);
    return new Response(JSON.stringify({ error: "کچھ غلط ہو گیا" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
