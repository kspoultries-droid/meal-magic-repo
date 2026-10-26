export type RiderFix = { lat: number; lng: number; accuracy: number; at: number };

export function validRiderFix(fix: RiderFix, now = Date.now()) {
  return Number.isFinite(fix.lat) && Number.isFinite(fix.lng) &&
    fix.lat >= -90 && fix.lat <= 90 && fix.lng >= -180 && fix.lng <= 180 &&
    Number.isFinite(fix.accuracy) && fix.accuracy >= 0 && fix.accuracy <= 200 &&
    now - fix.at >= -5000 && now - fix.at <= 30000;
}

export function shouldPublishFix(next: RiderFix, previous: RiderFix | null, now = Date.now()) {
  if (!validRiderFix(next, now)) return false;
  if (!previous) return true;
  const elapsed = now - previous.at;
  const dy = (next.lat - previous.lat) * 111320;
  const dx = (next.lng - previous.lng) * 111320 * Math.cos(next.lat * Math.PI / 180);
  return elapsed >= 30000 || (elapsed >= 10000 && Math.hypot(dx, dy) >= 20);
}

export function freshRiderLocation(updatedAt: string | null | undefined, now = Date.now()) {
  if (!updatedAt) return false;
  const age = now - Date.parse(updatedAt);
  return Number.isFinite(age) && age >= -5000 && age <= 90000;
}