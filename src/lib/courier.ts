/** Pure courier / shipment helpers shared by UI, admin tools and tests. */

export type ShipmentStatus =
  | "pending"
  | "dispatched"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "returned";

export const SHIPMENT_STATUSES: { value: ShipmentStatus; label: string }[] = [
  { value: "pending", label: "تیاری میں (Pending)" },
  { value: "dispatched", label: "روانہ ہو گیا (Dispatched)" },
  { value: "in_transit", label: "راستے میں (In transit)" },
  { value: "out_for_delivery", label: "ڈلیوری کے لیے نکل گیا" },
  { value: "delivered", label: "ڈلیور ہو گیا ✅" },
  { value: "returned", label: "واپس (Returned)" },
];

export const SHIPMENT_MESSAGES: Record<string, string> = {
  pending: "آپ کی شپمنٹ تیار کی جا رہی ہے 📦",
  dispatched: "آپ کا پارسل کورئیر کو دے دیا گیا ہے 🚚",
  in_transit: "آپ کا پارسل راستے میں ہے 🛣️",
  out_for_delivery: "آپ کا پارسل آج ڈلیوری کے لیے نکل چکا ہے 🏃",
  delivered: "آپ کا آرڈر ڈلیور ہو گیا ✅",
  returned: "آپ کا پارسل واپس ہو گیا ❌",
};

const RANKS: Record<string, number> = {
  pending: 0,
  dispatched: 1,
  in_transit: 2,
  out_for_delivery: 3,
  delivered: 4,
  returned: 4,
};

export const shipmentRank = (status?: string | null): number =>
  status && status in RANKS ? RANKS[status] : -1;

export const isKnownShipmentStatus = (status?: string | null): status is ShipmentStatus =>
  shipmentRank(status) >= 0;

/**
 * A courier update is only accepted when it is a known status and does not move
 * the shipment backwards (late / out-of-order webhooks are dropped).
 */
export const isValidShipmentTransition = (from: string | null | undefined, to: string): boolean => {
  if (!isKnownShipmentStatus(to)) return false;
  if (!isKnownShipmentStatus(from)) return true;
  return shipmentRank(to) >= shipmentRank(from);
};

const TERMINAL_ORDER_STATUSES = ["delivered", "completed", "cancelled"];

/** Order status implied by a shipment status — mirrors the DB trigger. */
export const orderStatusForShipment = (
  currentOrderStatus: string | null | undefined,
  shipmentStatus: string
): string | null => {
  if (currentOrderStatus && TERMINAL_ORDER_STATUSES.includes(currentOrderStatus)) return null;
  switch (shipmentStatus) {
    case "dispatched":
    case "in_transit":
    case "out_for_delivery":
      return "delivering";
    case "delivered":
      return "delivered";
    case "returned":
      return "cancelled";
    default:
      return null;
  }
};

/** Exponential backoff (seconds) with a cap, used by the courier retry queue. */
export const retryDelaySeconds = (attempts: number): number =>
  Math.min(60 * 60, Math.round(30 * Math.pow(2, Math.max(0, attempts))));

export const MAX_COURIER_RETRIES = 6;
