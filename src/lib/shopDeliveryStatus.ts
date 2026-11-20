/** Read-only delivery readiness of one shop, for admin badges. Mirrors no server rule; it only describes stored values. */
export interface ShopDeliveryInput { city_id?: string | null; pickup_lat?: number | null; pickup_lng?: number | null; ships_nationwide?: boolean | null; advance_percent?: number | null; store_type?: string | null }
export type ShopFlag = "no_city" | "no_pin" | "advance_needs_gateway";
export const shopDeliveryStatus = (s: ShopDeliveryInput) => {
  const flags: ShopFlag[] = [];
  if (!s.city_id) flags.push("no_city");
  if (!Number.isFinite(s.pickup_lat as number) || !Number.isFinite(s.pickup_lng as number)) flags.push("no_pin");
  if (Number(s.advance_percent) > 0) flags.push("advance_needs_gateway");
  const modes: ("local" | "courier")[] = s.ships_nationwide ? ["local", "courier"] : ["local"];
  return { modes, flags };
};
