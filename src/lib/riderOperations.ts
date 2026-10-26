import { freshRiderLocation } from "./riderLocation";

export const CLOSED_DELIVERIES = ["delivered", "completed", "cancelled", "returned_to_store"];
export function deliveryClosed(status: string) { return CLOSED_DELIVERIES.includes(status); }
export function riderPresenceFresh(rider: { is_available?: boolean; is_suspended?: boolean; last_seen_at?: string | null; location_updated_at?: string | null }, now = Date.now()) {
  return !!rider.is_available && !rider.is_suspended && freshRiderLocation(rider.last_seen_at, now) && freshRiderLocation(rider.location_updated_at, now);
}
export function groceryReady(status: string) { return ["ready", "ready_for_pickup"].includes(status); }
export function deliveryCash(order: { payment_method?: string | null; total_amount?: number | string | null; final_amount?: number | string | null }) {
  return (order.payment_method || "cod").toLowerCase() === "cod" ? Number(order.final_amount ?? order.total_amount ?? 0) : 0;
}
export function nextDeliveryAction(kind: string, status: string, stage = "assigned") {
  if (deliveryClosed(status) || stage === "return_pending") return null;
  if (stage === "assigned") return "arrived_pickup";
  if (stage === "arrived_pickup") return (kind === "food" ? status === "delivering" : groceryReady(status)) ? "pickup" : null;
  if (stage === "picked_up") return "arrived_customer";
  if (stage === "arrived_customer") return "deliver";
  return null;
}