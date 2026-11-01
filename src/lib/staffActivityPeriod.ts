export function staffActivityStart(days: number, now = new Date()): string {
  const clamped = Math.max(1, Math.min(365, Math.trunc(days) || 1));
  const karachiDay = new Date(now.getTime() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const midnight = new Date(`${karachiDay}T00:00:00+05:00`);
  return new Date(midnight.getTime() - (clamped - 1) * 86400000).toISOString();
}