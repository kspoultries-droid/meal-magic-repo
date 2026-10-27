export type RoutePoint = { lat: number; lng: number };
export type DeliveryKind = 'food' | 'grocery_cart' | 'grocery_list';
export function routePhase(stage: string) {
  if (stage === 'return_pending' || stage === 'delivered') return null;
  return ['assigned', 'arrived_pickup'].includes(stage) ? 'pickup' : 'customer';
}
export function routePoint(lat: unknown, lng: unknown): RoutePoint | null {
  return typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}
export function routeNeedsRefresh(next: RoutePoint, previous: RoutePoint | null, elapsed: number) {
  if (!previous) return true;
  const dy = (next.lat - previous.lat) * 111320;
  const dx = (next.lng - previous.lng) * 111320 * Math.cos(next.lat * Math.PI / 180);
  return elapsed >= 60000 && (Math.hypot(dx, dy) >= 150 || elapsed >= 180000);
}