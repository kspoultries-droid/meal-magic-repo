import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authorization = req.headers.get("Authorization");
    if (!url || !anon || !key) return reply({ error: "Service unavailable" }, 503);
    if (!authorization?.startsWith("Bearer ")) return reply({ error: "Sign in first" }, 401);
    const client = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return reply({ error: "Sign in first" }, 401);
    const body = await req.json();
    if (typeof body.path !== "string" || body.path.length > 1000 || body.path.includes("..") || body.path.startsWith("http")) return reply({ error: "Invalid document path" }, 400);
    const bucket = body.bucket || "partner-documents";
    if (!["partner-documents", "service-evidence", "delivery-proofs", "payout-receipts", "wallet-receipts"].includes(bucket)) return reply({ error: "Invalid evidence bucket" }, 400);
    const { data: allowed, error } = await client.rpc("staff_authorize_evidence", { _bucket: bucket, _path: body.path });
    if (error || allowed !== true) return reply({ error: "نجی ثبوت تک رسائی کی اجازت نہیں" }, 403);
    const admin = createClient(url, key);
    const { data, error: signError } = await admin.storage.from(bucket).createSignedUrl(body.path, 300);
    if (signError || !data) return reply({ error: "ثبوت نہیں ملا" }, 404);
    return reply({ signedUrl: data.signedUrl });
  } catch { return reply({ error: "درخواست مکمل نہیں ہوئی" }, 400); }
});