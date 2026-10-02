import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/firebase_messaging";
const Body = z.object({ id: z.string().uuid() });
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  // Only the database trigger (which holds the internal shared secret) may call this.
  const provided = req.headers.get("x-push-secret") ?? "";
  const { data: sec } = await admin.from("internal_secrets").select("value").eq("name", "push_dispatch").maybeSingle();
  if (!sec?.value || provided !== sec.value) return json({ error: "Unauthorized" }, 401);

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: "invalid body" }, 400);

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const FCM_KEY = Deno.env.get("FIREBASE_MESSAGING_API_KEY");
  if (!LOVABLE_API_KEY || !FCM_KEY) return json({ skipped: "push not configured" });

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
  const SITE = (Deno.env.get("PUBLIC_SITE_URL") || "https://easylife.apnahub.online").replace(/\/$/, "");
  const path = n.path?.startsWith("/") ? n.path : n.kind === "new_order" ? "/restaurant-dashboard" : "/";
  const link = `${SITE}${path}`; // webpush link must be an absolute HTTPS URL
  const urgent = n.kind === "offer" || n.kind === "new_order";
  let sent = 0;
  const failures: Array<{ status: number; body: string }> = [];
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
          data: { path, kind: n.kind, link },
          android: { priority: "high", notification: { sound: "default", channel_id: urgent ? "orders" : "default" } },
          webpush: {
            headers: { Urgency: "high", TTL: "3600" },
            notification: {
              icon: `${SITE}/pwa-192x192.png`,
              badge: `${SITE}/pwa-192x192.png`,
              tag: n.id,
              requireInteraction: urgent,
              vibrate: [300, 100, 300],
            },
            fcm_options: { link },
          },
        },
      }),
    });
    if (res.ok) { sent++; continue; }
    const txt = await res.text();
    console.error("FCM send failed", res.status, txt);
    failures.push({ status: res.status, body: txt.slice(0, 500) });
    // Sirf waqai purane/ghalat tokens hatao — request ki ghalti par token delete na ho
    if (res.status === 404 || txt.includes("UNREGISTERED") || /registration token is not a valid/i.test(txt)) {
      await admin.from("device_tokens").delete().eq("token", token);
    }
  }
  return json({ sent, tokens: tokens?.length || 0, failures });
});
