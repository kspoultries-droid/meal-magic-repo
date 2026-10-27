import { describe, it, expect } from "vitest";
import { startPath } from "@/lib/appMode";

describe("startPath", () => {
  it("rider only opens rider dashboard", () => {
    expect(startPath(null, { isRider: true, isRestaurantOwner: false })).toBe("/rider-dashboard");
  });
  it("restaurant only opens restaurant dashboard", () => {
    expect(startPath(null, { isRider: false, isRestaurantOwner: true })).toBe("/restaurant-dashboard");
  });
  it("customer mode choice stays on home", () => {
    expect(startPath("customer", { isRider: true, isRestaurantOwner: false })).toBeNull();
  });
  it("saved rider mode without rider role stays home", () => {
    expect(startPath("rider", { isRider: false, isRestaurantOwner: false })).toBeNull();
  });
  it("both roles with no choice stays home", () => {
    expect(startPath(null, { isRider: true, isRestaurantOwner: true })).toBeNull();
  });
});
