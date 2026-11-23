export const PARTNER_ACTIVE_STATUSES = ["pending", "assigned"];
export const PARTNER_CLOSED_STATUSES = ["delivered", "cancelled"];

export function partnerTransitionAllowed(from: string, to: string) {
  return (from === "pending" && (to === "assigned" || to === "cancelled")) ||
    (from === "assigned" && (to === "delivered" || to === "cancelled"));
}