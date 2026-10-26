import { describe, expect, it } from "vitest";
import { deliveryCash, deliveryClosed, groceryReady, nextDeliveryAction, riderPresenceFresh } from "@/lib/riderOperations";

const now = Date.parse("2026-10-26T00:26:00Z");
const at = new Date(now).toISOString();
describe("supervised rider operations", () => {
  it("excludes old availability even with a fresh heartbeat", () => {
    expect(riderPresenceFresh({ is_available: true, last_seen_at: at, location_updated_at: new Date(now - 91000).toISOString() }, now)).toBe(false);
    expect(riderPresenceFresh({ is_available: true, last_seen_at: at, location_updated_at: at }, now)).toBe(true);
  });
  it("excludes fresh GPS with an old heartbeat", () => {
    expect(riderPresenceFresh({ is_available: true, last_seen_at: new Date(now - 91000).toISOString(), location_updated_at: at }, now)).toBe(false);
  });
  it("grocery confirmation and packing do not mean ready for pickup", () => {
    for (const state of ["confirmed", "picking", "packed", "delivering"]) expect(groceryReady(state)).toBe(false);
    expect(groceryReady("ready_for_pickup")).toBe(true);
    expect(groceryReady("ready")).toBe(true);
  });
  it("does not offer completion before pickup and arrival", () => {
    expect(nextDeliveryAction("grocery_cart", "ready_for_pickup", "assigned")).toBe("arrived_pickup");
    expect(nextDeliveryAction("grocery_cart", "ready_for_pickup", "arrived_pickup")).toBe("pickup");
    expect(nextDeliveryAction("grocery_cart", "delivering", "picked_up")).toBe("arrived_customer");
    expect(nextDeliveryAction("grocery_cart", "delivering", "arrived_customer")).toBe("deliver");
  });
  it("food kitchen dispatch is not proof the rider picked it up", () => {
    expect(nextDeliveryAction("food", "delivering", "assigned")).toBe("arrived_pickup");
    expect(nextDeliveryAction("food", "preparing", "arrived_pickup")).toBeNull();
  });
  it("keeps return pending blocked until supervision resolves it", () => {
    expect(nextDeliveryAction("food", "delivering", "return_pending")).toBeNull();
    expect(deliveryClosed("delivering")).toBe(false);
    expect(deliveryClosed("returned_to_store")).toBe(true);
  });
  it("uses final grocery amount for actual cash collection", () => {
    expect(deliveryCash({ total_amount: 1500, final_amount: 1420, payment_method: "cod" })).toBe(1420);
  });
  it("does not collect cash on prepaid orders", () => {
    expect(deliveryCash({ total_amount: 1500, payment_method: "card" })).toBe(0);
  });
});