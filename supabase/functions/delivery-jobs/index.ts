import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const Point = z.object({
  phone: z.string().max(40).nullish(), address: z.string().max(500).nullish(), city: z.string().max(100).nullish(),
  lat: z.number().nullish(), lng: z.number().nullish(),
}).passthrough();
const Body = z.object({
  external_order_no: z.union([z.string(), z.number()]).transform(String).pipe(z.string().min(1).max(80)),
  amount: z.number().min(0).max(1_000_000),
  cod: z.boolean().default(true),
  pickup: z.record(z.unknown()).nullish(),
  dropoff: Point,
});

const j = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return j({ error: "method" }, 405);
  const key = Deno.env.get("APNAHUB_DELIVERY_KEY");
  const auth = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!key || !auth || auth !== key) return j({ error: "unauthorized" }, 401);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return j({ error: parsed.error.flatten().fieldErrors }, 400);
  const d = parsed.data;
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await admin.from("partner_delivery_jobs")
    .upsert({ source: "apnahub", external_order_no: d.external_order_no, amount: d.amount, cod: d.cod, pickup: d.pickup ?? null, dropoff: d.dropoff, updated_at: new Date().toISOString() }, { onConflict: "source,external_order_no" })
    .select("id,status").single();
  if (error) return j({ error: "save_failed" }, 500);
  return j({ id: data.id, status: data.status === "pending" ? "accepted" : data.status });
});
