export interface DeliveryLocation {
  id?: string;
  label: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
  ownerId?: string;
  source?: "gps" | "address";
}
const KEY = "easylife:delivery-location";
export const LOCATION_EVENT = "easylife:delivery-location-changed";
export function readDeliveryLocation(userId?: string): DeliveryLocation | null {
  try {
    const loc: DeliveryLocation | null = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!loc) return null;
    if (loc.source === "gps" && !loc.ownerId && !loc.id) return loc;
    return userId && loc.ownerId === userId ? loc : null;
  } catch { return null; }
}
export function writeDeliveryLocation(loc: DeliveryLocation | null, userId?: string) {
  try {
    if (loc) localStorage.setItem(KEY, JSON.stringify({ ...loc, ownerId: loc.source === "gps" ? undefined : userId, source: loc.source || "address" }));
    else localStorage.removeItem(KEY);
  } catch { /* Storage may be disabled. */ }
  window.dispatchEvent(new CustomEvent(LOCATION_EVENT));
}
