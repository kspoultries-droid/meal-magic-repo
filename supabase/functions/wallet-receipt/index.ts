import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
const schema = z.object({ amount: z.coerce.number().finite().min(10).max(100000), accountId: z.string().uuid(), reference: z.string().trim().toUpperCase().regex(/^[A-Z0-9][A-Z0-9-]{5,79}$/), paidAt: z.string().datetime({ offset: true }) });
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({error:"Method not allowed"},405);
  try {
    const url = Deno.env.get("SUPABASE_URL"); const anon = Deno.env.get("SUPABASE_ANON_KEY"); const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anon || !key) return reply({error:"Service unavailable"},503);
    const authorization = req.headers.get("Authorization"); if (!authorization?.startsWith("Bearer ")) return reply({error:"Sign in first"},401);
    const client = createClient(url,anon,{global:{headers:{Authorization:authorization}}});
    const {data:{user},error:authError} = await client.auth.getUser();
    if (authError || !user) return reply({error:"Sign in first"},401);
    if (!user.email_confirmed_at) return reply({error:"Verify your email first"},403);
    const {data:pending} = await client.from("wallet_transactions").select("id").eq("user_id",user.id).eq("type","topup").eq("status","pending").limit(1);
    if (pending?.length) return reply({error:"A request is already pending; wait for its review"},400);
    if (Number(req.headers.get("content-length") || 0) > 6*1024*1024) return reply({error:"Receipt must be under 5 MB"},400);
    const form = await req.formData();
    const parsed = schema.safeParse(Object.fromEntries(["amount","accountId","reference","paidAt"].map(k=>[k,form.get(k)])));
    if (!parsed.success) return reply({error:"Enter a valid amount, deposit account, transaction reference and payment date"},400);
    const file = form.get("receipt");
    if (!(file instanceof File) || file.size===0 || file.size>5*1024*1024 || !["image/jpeg","image/png","image/webp"].includes(file.type)) return reply({error:"Choose a JPG, PNG or WebP receipt up to 5 MB"},400);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const png = bytes[0]===137 && bytes[1]===80 && bytes[2]===78 && bytes[3]===71;
    const jpg = bytes[0]===255 && bytes[1]===216 && bytes[2]===255;
    const webp = new TextDecoder().decode(bytes.slice(0,4))==="RIFF" && new TextDecoder().decode(bytes.slice(8,12))==="WEBP";
    if (!((file.type==="image/png"&&png)||(file.type==="image/jpeg"&&jpg)||(file.type==="image/webp"&&webp))) return reply({error:"Invalid image file"},400);
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))).map(b=>b.toString(16).padStart(2,"0")).join("");
    const admin = createClient(url,key); const path = `${user.id}/${crypto.randomUUID()}.${file.type.split("/")[1]}`;
    const {error:uploadError} = await admin.storage.from("wallet-receipts").upload(path,bytes,{contentType:file.type,upsert:false});
    if(uploadError) return reply({error:"Receipt could not be saved"},500);
    const v = parsed.data;
    const {data,error} = await admin.rpc("submit_wallet_receipt",{_user_id:user.id,_amount:v.amount,_account_id:v.accountId,_reference:v.reference,_receipt_path:path,_sha256:hash,_paid_at:v.paidAt});
    if(error){await admin.storage.from("wallet-receipts").remove([path]);return reply({error:error.message},400);}
    return reply({id:data});
  } catch { return reply({error:"Receipt request could not be processed"},400); }
});