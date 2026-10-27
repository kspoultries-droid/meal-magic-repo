import { describe, expect, it } from 'vitest';
import { routePhase, routePoint, routeNeedsRefresh } from '@/lib/deliveryRoute';
describe('staged delivery route', () => {
  it('routes to the shop until pickup', () => { expect(routePhase('assigned')).toBe('pickup'); expect(routePhase('arrived_pickup')).toBe('pickup'); });
  it('routes to customer after pickup', () => { expect(routePhase('picked_up')).toBe('customer'); expect(routePhase('arrived_customer')).toBe('customer'); });
  it('does not route a supervised return as customer delivery', () => { expect(routePhase('return_pending')).toBeNull(); });
  it('rejects missing and impossible pins rather than drawing fake routes', () => { expect(routePoint(null, null)).toBeNull(); expect(routePoint(501, 70)).toBeNull(); expect(routePoint(28.42,70.3)).toEqual({lat:28.42,lng:70.3}); });
  it('does not recalculate on each GPS tick', () => { expect(routeNeedsRefresh({lat:28.43,lng:70.3},{lat:28.42,lng:70.3},10000)).toBe(false); expect(routeNeedsRefresh({lat:28.43,lng:70.3},{lat:28.42,lng:70.3},60000)).toBe(true); });
});