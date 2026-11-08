const toRad = (d: number) => (d * Math.PI) / 180;
export const distanceKm = (aLat: number, aLng: number, bLat: number, bLng: number) => {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
};

type StoreLike = { pickup_lat?: number | null; pickup_lng?: number | null; city_id?: string | null; is_active?: boolean };

/** Hides grocery shops farther than their city's limit from the customer's delivery pin.
 *  Mirrors the server rule; the server stays authoritative at checkout. Without a pin, nothing is hidden. */
export const filterStoresByReach = <T extends StoreLike>(
  stores: T[],
  loc: { lat?: number | null; lng?: number | null } | null,
  limits: Record<string, number>,
  nearestFirst: boolean,
): (T & { _km?: number })[] => {
  if (!loc || loc.lat == null || loc.lng == null) return stores;
  const out = stores
    .filter((s) => s.pickup_lat != null && s.pickup_lng != null)
    .map((s) => ({ ...s, _km: distanceKm(loc.lat!, loc.lng!, s.pickup_lat!, s.pickup_lng!) }))
    .filter((s) => s._km <= (limits[s.city_id || ""] ?? 6));
  if (nearestFirst) out.sort((a, b) => Number(!!b.is_active) - Number(!!a.is_active) || a._km - b._km);
  return out;
};
