import { describe, expect, it } from "vitest";
import { freshRiderLocation, shouldPublishFix, validRiderFix, type RiderFix } from "@/lib/riderLocation";

const now = 1700000000000;
const fix: RiderFix = { lat: 28.42, lng: 70.3, accuracy: 15, at: now };
describe("rider GPS safety", () => {
  it("accepts zero coordinates, rejects invalid or inaccurate GPS", () => {
    expect(validRiderFix({ ...fix, lat: 0, lng: 0 }, now)).toBe(true);
    expect(validRiderFix({ ...fix, lat: 91 }, now)).toBe(false);
    expect(validRiderFix({ ...fix, accuracy: 201 }, now)).toBe(false);
    expect(validRiderFix({ ...fix, at: now - 30001 }, now)).toBe(false);
  });
  it("publishes initial fix and movement at most every 10 seconds", () => {
    expect(shouldPublishFix(fix, null, now)).toBe(true);
    const moved = { ...fix, lat: fix.lat + 0.001, at: now + 10000 };
    expect(shouldPublishFix(moved, fix, now + 9999)).toBe(false);
    expect(shouldPublishFix(moved, fix, now + 10000)).toBe(true);
  });
  it("refreshes stationary GPS after 30 seconds", () => {
    expect(shouldPublishFix({ ...fix, at: now + 29999 }, fix, now + 29999)).toBe(false);
    expect(shouldPublishFix({ ...fix, at: now + 30000 }, fix, now + 30000)).toBe(true);
  });
  it("never marks a GPS fix over 90 seconds old as live", () => {
    expect(freshRiderLocation(new Date(now - 90000).toISOString(), now)).toBe(true);
    expect(freshRiderLocation(new Date(now - 90001).toISOString(), now)).toBe(false);
    expect(freshRiderLocation(null, now)).toBe(false);
    expect(freshRiderLocation("invalid", now)).toBe(false);
  });
});