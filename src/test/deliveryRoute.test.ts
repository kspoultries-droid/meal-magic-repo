import { describe, expect, it } from 'vitest';
import { googleNavigationUrl, routePhase, routePoint, routeNeedsRefresh } from '@/lib/deliveryRoute';
describe('staged delivery route', () => {
  it('routes to the shop until pickup', () => { expect(routePhase('assigned')).toBe('pickup'); expect(routePhase('arrived_pickup')).toBe('pickup'); });
  it('routes to customer after pickup', () => { expect(routePhase('picked_up')).toBe('customer'); expect(routePhase('arrived_customer')).toBe('customer'); });
  it('does not route a supervised return as customer delivery', () => { expect(routePhase('return_pending')).toBeNull(); });
  it('rejects missing and impossible pins rather than drawing fake routes', () => { expect(routePoint(null, null)).toBeNull(); expect(routePoint(501, 70)).toBeNull(); expect(routePoint(28.42,70.3)).toEqual({lat:28.42,lng:70.3}); });
  it('does not recalculate on each GPS tick', () => { expect(routeNeedsRefresh({lat:28.43,lng:70.3},{lat:28.42,lng:70.3},10000)).toBe(false); expect(routeNeedsRefresh({lat:28.43,lng:70.3},{lat:28.42,lng:70.3},60000)).toBe(true); });
});

describe('API-free Google Maps navigation', () => {
  const pickup = { lat: 27.5938456, lng: 68.7818771 };
  const customer = { lat: 27.58277, lng: 68.778615 };
  it('uses the authorized shop pin before pickup', () => {
    for (const stage of ['assigned', 'arrived_pickup']) {
      const url = new URL(googleNavigationUrl(stage, pickup, customer) || 'https://invalid.test');
      expect(url.searchParams.get('destination')).toBe('27.5938456,68.7818771');
    }
  });
  it('switches to the authorized customer pin after pickup', () => {
    for (const stage of ['picked_up', 'arrived_customer']) {
      const url = new URL(googleNavigationUrl(stage, pickup, customer) || 'https://invalid.test');
      expect(url.searchParams.get('destination')).toBe('27.58277,68.778615');
    }
  });
  it('requests driving navigation without an API key or stale origin', () => {
    const url = new URL(googleNavigationUrl('assigned', pickup, customer) || 'https://invalid.test');
    expect(url.origin).toBe('https://www.google.com');
    expect(url.pathname).toBe('/maps/dir/');
    expect(url.searchParams.get('api')).toBe('1');
    expect(url.searchParams.get('dir_action')).toBe('navigate');
    expect(url.searchParams.get('travelmode')).toBe('driving');
    expect(url.searchParams.has('key')).toBe(false);
    expect(url.searchParams.has('origin')).toBe(false);
  });
  it('never substitutes the other pin for a missing destination', () => {
    expect(googleNavigationUrl('assigned', null, customer)).toBeNull();
    expect(googleNavigationUrl('picked_up', pickup, null)).toBeNull();
  });
  it('rejects invalid destination coordinates', () => {
    expect(googleNavigationUrl('assigned', {lat: 91, lng: 68}, customer)).toBeNull();
  });
  it('does not navigate a completed, cancelled, return or unknown stage', () => {
    for (const stage of ['delivered', 'completed', 'cancelled', 'return_pending', 'returned_to_store', 'unknown']) {
      expect(googleNavigationUrl(stage, pickup, customer)).toBeNull();
    }
  });
});