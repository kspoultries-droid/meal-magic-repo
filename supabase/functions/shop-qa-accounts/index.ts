import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
const ids = ['038edd8f-81dd-41b1-9de3-410746db9694','51b28763-ce6b-40d5-8fe1-e8b72b87063b','a1bfd632-caee-4c7d-95ee-4973c1e394b5'];
Deno.serve(async req => {
 const reply=(x:unknown,status=200)=>new Response(JSON.stringify(x),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});
 if(req.method==='OPTIONS')return reply({});
 const url=Deno.env.get('SUPABASE_URL'); const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!key)return reply({error:'Unavailable'},500);
 const c=createClient(url,key); const token=req.headers.get('Authorization')?.replace(/^Bearer /,'');
 if(!token)return reply({error:'Unauthorized'},401);
 const {data:{user}}=await c.auth.getUser(token);
 if(!user)return reply({error:'Unauthorized'},401);
 const {data:admin}=await c.rpc('has_role',{_user_id:user.id,_role:'admin'});
 if(!admin)return reply({error:'Forbidden'},403);
 const b=await req.json().catch(()=>null);
 if(!b||!['confirm','delete'].includes(b.action))return reply({error:'Invalid action'},400);
 for(const id of ids){const {data:{user:target}}=await c.auth.admin.getUserById(id);if(!target)continue;if(!target.email?.startsWith('qa-shop-')||!target.email.endsWith('@example.com'))return reply({error:'Not temporary account'},403);const {error}=b.action==='confirm'?await c.auth.admin.updateUserById(id,{email_confirm:true}):await c.auth.admin.deleteUser(id);if(error)return reply({error:error.message},400);}
 return reply({ok:true});
});