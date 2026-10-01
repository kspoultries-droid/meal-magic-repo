import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/firebase_messaging";
const Body = z.object({ id: z.string().uuid() });
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: "invalid body" }, 400);

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const FCM_KEY = Deno.env.get("FIREBASE_MESSAGING_API_KEY");
  if (!LOVABLE_API_KEY || !FCM_KEY) return json({ skipped: "push not configured" });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  // Claim the notification once (prevents replays/duplicate sends).
  const { data: n } = await admin
    .from("notifications")
    .update({ pushed_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .is("pushed_at", null)
    .select("id,user_id,title,body,path,kind")
    .maybeSingle();
  if (!n) return json({ skipped: "already sent or missing" });

  const { data: tokens } = await admin.from("device_tokens").select("token").eq("user_id", n.user_id);
  let sent = 0;
  for (const { token } of tokens || []) {
    const res = await fetch(`${GATEWAY_URL}/v1/projects/_/messages:send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": FCM_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title: n.title, body: n.body || "" },
          data: { path: n.path || "/", kind: n.kind },
          android: { priority: "high", notification: { sound: "default", channel_id: n.kind === "offer" || n.kind === "new_order" ? "orders" : "default" } },
          webpush: { fcm_options: { link: n.path || "/" } },
        },
      }),
    });
    if (res.ok) sent++;
    else {
      const txt = await res.text();
      if (res.status === 404 || txt.includes("UNREGISTERED") || txt.includes("INVALID_ARGUMENT")) {
        await admin.from("device_tokens").delete().eq("token", token);
      } else console.error("FCM send failed", res.status, txt);
    }
  }
  return json({ sent });
});
