export type RoutePoint = { lat: number; lng: number };
export type DeliveryKind = 'food' | 'grocery_cart' | 'grocery_list';
export function routePhase(stage: string) {
  if (['assigned', 'arrived_pickup'].includes(stage)) return 'pickup';
  if (['picked_up', 'arrived_customer'].includes(stage)) return 'customer';
  return null;
}
export function routePoint(lat: unknown, lng: unknown): RoutePoint | null {
  return typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}
export function routeNeedsRefresh(next: RoutePoint, previous: RoutePoint | null, elapsed: number) {
  if (!previous) return true;
  const dy = (next.lat - previous.lat) * 111320;
  const dx = (next.lng - previous.lng) * 111320 * Math.cos(next.lat * Math.PI / 180);
  return elapsed >= 12000 && (Math.hypot(dx, dy) >= 40 || elapsed >= 60000);
}

// Only use destinations returned by the authorized order context, never a saved browsing address.
export function googleNavigationUrl(stage: string, pickup: RoutePoint | null, customer: RoutePoint | null): string | null {
  const phase = routePhase(stage);
  if (!phase) return null;
  const target = phase === 'pickup' ? pickup : customer;
  if (!target || !routePoint(target.lat, target.lng)) return null;
  const query = new URLSearchParams({ api: '1', destination: `${target.lat},${target.lng}`, travelmode: 'driving', dir_action: 'navigate' });
  // Leave origin unset: Google Maps uses the device's current position.
  return `https://www.google.com/maps/dir/?${query}`;
}