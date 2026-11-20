/** Pure, read-only city delivery coverage summary for the admin overview. */
export interface CoverageCity { id: string; name: string; food_enabled: boolean; grocery_enabled: boolean; wholesale_enabled: boolean; grocery_max_km: number | null; max_dispatch_km: number | null; default_courier: string | null; courier_advance_percent: number | null }
export interface CoverageShop { city_id: string | null; is_active: boolean | null; ships_nationwide: boolean | null; pickup_lat: number | null; pickup_lng: number | null; advance_percent: number | null }
export interface CoverageRate { city_id: string | null; mode: string; is_active: boolean | null }
export interface CoverageRoute { from_city_id: string | null; is_active: boolean | null }
export type WarningCode = "no_riders" | "radius_unrealistic" | "shops_missing_pin" | "nationwide_without_courier_rates" | "advance_without_gateway" | "courier_text_only" | "no_local_rate";

/** Local radius above this is not a believable rider radius and is flagged for review. */
export const MAX_REALISTIC_LOCAL_KM = 50;

export const summarizeCity = (c: CoverageCity, shops: CoverageShop[], rates: CoverageRate[], routes: CoverageRoute[], riderCount: number) => {
  const mine = shops.filter((s) => s.city_id === c.id);
  const localRates = rates.filter((r) => (r.city_id === c.id || r.city_id == null) && r.is_active && r.mode !== "courier").length;
  const courierRates = rates.filter((r) => (r.city_id === c.id || r.city_id == null) && r.is_active && r.mode === "courier").length;
  const activeRoutes = routes.filter((r) => r.from_city_id === c.id && r.is_active).length;
  const nationwide = mine.filter((s) => s.ships_nationwide).length;
  const missingPin = mine.filter((s) => !Number.isFinite(s.pickup_lat as number) || !Number.isFinite(s.pickup_lng as number)).length;
  const advanceShops = mine.filter((s) => Number(s.advance_percent) > 0).length;
  const warnings: WarningCode[] = [];
  if (riderCount === 0) warnings.push("no_riders");
  if (Number(c.grocery_max_km) > MAX_REALISTIC_LOCAL_KM) warnings.push("radius_unrealistic");
  if (missingPin > 0) warnings.push("shops_missing_pin");
  if (nationwide > 0 && courierRates + activeRoutes === 0) warnings.push("nationwide_without_courier_rates");
  if (advanceShops > 0 || Number(c.courier_advance_percent) > 0) warnings.push("advance_without_gateway");
  if (c.default_courier) warnings.push("courier_text_only");
  if ((c.food_enabled || c.grocery_enabled) && localRates === 0) warnings.push("no_local_rate");
  return { shops: mine.length, activeShops: mine.filter((s) => s.is_active).length, nationwide, missingPin, advanceShops, localRates, courierRates, activeRoutes, riderCount, warnings };
};
