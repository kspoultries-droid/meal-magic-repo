import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const RANKS: Record<string, number> = {
  pending: 0,
  dispatched: 1,
  in_transit: 2,
  out_for_delivery: 3,
  delivered: 4,
  returned: 4,
};

const MAX_RETRIES = 6;
const BATCH_SIZE = 25;
const retryDelaySeconds = (attempts: number) => Math.min(3600, Math.round(30 * Math.pow(2, attempts)));

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Apply one courier update. Returns "applied" | "skipped" or throws to retry. */
async function applyUpdate(orderId: string, shipmentStatus: string, courierName?: string, tracking?: string) {
  if (!(shipmentStatus in RANKS)) return "skipped";

  const { data: order, error } = await admin
    .from("grocery_cart_orders")
    .select("id,status,shipment_status")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!order) return "skipped"; // unknown order — do not retry forever

  const prevRank = order.shipment_status && order.shipment_status in RANKS ? RANKS[order.shipment_status] : -1;
  if (RANKS[shipmentStatus] < prevRank) return "skipped"; // late / out-of-order webhook
  if (order.shipment_status === shipmentStatus) return "skipped"; // idempotent

  const patch: Record<string, unknown> = { shipment_status: shipmentStatus };
  if (courierName) patch.courier_name = courierName;
  if (tracking) patch.tracking_number = tracking;

  const { error: upErr } = await admin.from("grocery_cart_orders").update(patch).eq("id", orderId);
  if (upErr) throw new Error(upErr.message);
  return "applied";
}

async function drainQueue() {
  const { data: rows, error } = await admin
    .from("courier_sync_queue")
    .select("*")
    .eq("state", "pending")
    .lte("next_attempt_at", new Date().toISOString())
    .order("next_attempt_at", { ascending: true })
    .limit(BATCH_SIZE);
  if (error) throw new Error(error.message);

  let applied = 0;
  let failed = 0;
  for (const row of rows || []) {
    try {
      await applyUpdate(row.order_id, row.shipment_status, row.courier_name, row.tracking_number);
      await admin.from("courier_sync_queue").update({ state: "done", attempts: row.attempts + 1, last_error: null }).eq("id", row.id);
      applied++;
    } catch (e) {
      const attempts = row.attempts + 1;
      const terminal = attempts >= MAX_RETRIES;
      await admin
        .from("courier_sync_queue")
        .update({
          attempts,
          state: terminal ? "failed" : "pending",
          last_error: String((e as Error).message).slice(0, 500),
          next_attempt_at: new Date(Date.now() + retryDelaySeconds(attempts) * 1000).toISOString(),
        })
        .eq("id", row.id);
      failed++;
    }
  }
  return { processed: (rows || []).length, applied, failed };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Only the trusted courier integration / scheduler may call this endpoint.
  const expected = Deno.env.get("COURIER_WEBHOOK_SECRET");
  const provided =
    req.headers.get("x-courier-secret") ??
    new URL(req.url).searchParams.get("secret") ??
    "";
  if (!expected || provided !== expected) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const url = new URL(req.url);
    if (url.searchParams.get("mode") === "retry" || req.method === "GET") {
      return json(await drainQueue());
    }


    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: "Invalid JSON body" }, 400);

    const orderId = String(body.order_id ?? "");
    const shipmentStatus = String(body.shipment_status ?? "");
    const provider = String(body.provider ?? "unknown");
    const eventKey = String(body.event_key ?? `${orderId}:${shipmentStatus}:${body.event_time ?? ""}`);

    if (!/^[0-9a-f-]{36}$/i.test(orderId)) return json({ error: "order_id must be a uuid" }, 400);
    if (!(shipmentStatus in RANKS)) return json({ error: "unknown shipment_status" }, 400);

    // Idempotency: same provider event is recorded only once.
    const { error: insErr } = await admin.from("courier_sync_queue").insert({
      order_id: orderId,
      provider,
      event_key: eventKey,
      tracking_number: body.tracking_number ?? null,
      shipment_status: shipmentStatus,
      payload: body,
    });
    if (insErr && !insErr.message.includes("duplicate key")) throw new Error(insErr.message);
    if (insErr) return json({ status: "duplicate" });

    try {
      const result = await applyUpdate(orderId, shipmentStatus, body.courier_name, body.tracking_number);
      await admin
        .from("courier_sync_queue")
        .update({ state: "done", attempts: 1 })
        .eq("provider", provider)
        .eq("event_key", eventKey);
      return json({ status: result });
    } catch (e) {
      // Keep it queued — the retry drain will pick it up with backoff.
      await admin
        .from("courier_sync_queue")
        .update({
          attempts: 1,
          last_error: String((e as Error).message).slice(0, 500),
          next_attempt_at: new Date(Date.now() + retryDelaySeconds(1) * 1000).toISOString(),
        })
        .eq("provider", provider)
        .eq("event_key", eventKey);
      return json({ status: "queued_for_retry" }, 202);
    }
  } catch (e) {
    return json({ error: String((e as Error).message) }, 500);
  }
});
