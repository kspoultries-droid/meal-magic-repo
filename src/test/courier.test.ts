import { describe, it, expect } from "vitest";
import {
  isValidShipmentTransition,
  orderStatusForShipment,
  shipmentRank,
  retryDelaySeconds,
  isKnownShipmentStatus,
} from "@/lib/courier";
import { computeCityGating } from "@/lib/cityGating";

describe("courier shipment transitions", () => {
  it("accepts forward moves", () => {
    expect(isValidShipmentTransition("pending", "dispatched")).toBe(true);
    expect(isValidShipmentTransition("dispatched", "delivered")).toBe(true);
  });

  it("rejects backward (late/out-of-order webhook) moves", () => {
    expect(isValidShipmentTransition("out_for_delivery", "dispatched")).toBe(false);
    expect(isValidShipmentTransition("delivered", "in_transit")).toBe(false);
  });

  it("allows repeating the same status (idempotent webhook)", () => {
    expect(isValidShipmentTransition("in_transit", "in_transit")).toBe(true);
  });

  it("rejects unknown statuses", () => {
    expect(isValidShipmentTransition("pending", "exploded")).toBe(false);
    expect(isKnownShipmentStatus("banana")).toBe(false);
    expect(shipmentRank("banana")).toBe(-1);
  });

  it("accepts the first update when there is no previous status", () => {
    expect(isValidShipmentTransition(null, "dispatched")).toBe(true);
  });
});

describe("order status derived from shipment", () => {
  it("maps transit statuses to delivering", () => {
    expect(orderStatusForShipment("confirmed", "dispatched")).toBe("delivering");
    expect(orderStatusForShipment("delivering", "out_for_delivery")).toBe("delivering");
  });

  it("maps delivered and returned", () => {
    expect(orderStatusForShipment("delivering", "delivered")).toBe("delivered");
    expect(orderStatusForShipment("delivering", "returned")).toBe("cancelled");
  });

  it("never overwrites a terminal order status", () => {
    expect(orderStatusForShipment("delivered", "in_transit")).toBeNull();
    expect(orderStatusForShipment("cancelled", "delivered")).toBeNull();
    expect(orderStatusForShipment("completed", "returned")).toBeNull();
  });

  it("ignores pending shipments", () => {
    expect(orderStatusForShipment("confirmed", "pending")).toBeNull();
  });
});

describe("retry backoff", () => {
  it("grows exponentially and is capped at one hour", () => {
    expect(retryDelaySeconds(0)).toBe(30);
    expect(retryDelaySeconds(1)).toBe(60);
    expect(retryDelaySeconds(3)).toBe(240);
    expect(retryDelaySeconds(20)).toBe(3600);
  });
});

describe("city gating", () => {
  const base = {
    food_enabled: true,
    grocery_enabled: true,
    wholesale_enabled: true,
    auto_hide_without_rider: true,
    rider_count: 0,
  };

  it("hides food and grocery when no rider is available", () => {
    const g = computeCityGating(base);
    expect(g.foodLive).toBe(false);
    expect(g.groceryLive).toBe(false);
  });

  it("keeps bazar (courier) live without riders", () => {
    expect(computeCityGating(base).wholesaleLive).toBe(true);
  });

  it("shows food and grocery once a rider exists", () => {
    const g = computeCityGating({ ...base, rider_count: 2 });
    expect(g.foodLive).toBe(true);
    expect(g.groceryLive).toBe(true);
  });

  it("respects admin toggles even with riders", () => {
    const g = computeCityGating({ ...base, rider_count: 5, food_enabled: false });
    expect(g.foodLive).toBe(false);
    expect(g.groceryLive).toBe(true);
  });

  it("keeps services live when auto-hide is off and no riders", () => {
    const g = computeCityGating({ ...base, auto_hide_without_rider: false });
    expect(g.foodLive).toBe(true);
  });

  it("blocks nothing when no city is selected", () => {
    expect(computeCityGating(null)).toEqual({ foodLive: true, groceryLive: true, wholesaleLive: true });
  });
});
