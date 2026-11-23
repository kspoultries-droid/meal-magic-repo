import { describe, expect, it, vi } from "vitest";
import { restaurantTransitions, runRestaurantTransitions } from "@/lib/restaurantOrderActions";

describe("streamlined restaurant actions", () => {
  it("accepts and starts cooking in one requested action without skipping server stages", async () => {
    const persist = vi.fn().mockResolvedValue(undefined);
    expect(await runRestaurantTransitions("pending", "accept", false, persist)).toBe("preparing");
    expect(persist.mock.calls).toEqual([["pending", "confirmed"], ["confirmed", "preparing"]]);
  });
  it("resumes a partially accepted order without accepting twice", () => {
    expect(restaurantTransitions("confirmed", "accept")).toEqual(["preparing"]);
  });
  it("stops immediately on a failed server save", async () => {
    const persist = vi.fn().mockRejectedValue(new Error("denied"));
    await expect(runRestaurantTransitions("pending", "accept", false, persist)).rejects.toThrow("denied");
    expect(persist).toHaveBeenCalledTimes(1);
  });
  it("allows explicit food readiness before a rider is assigned", () => {
    expect(restaurantTransitions("preparing", "ready", false)).toEqual(["delivering"]);
  });
  it("does not let a restaurant finish a rider delivery", () => {
    expect(restaurantTransitions("delivering", "complete", true)).toEqual([]);
    expect(restaurantTransitions("delivering", "complete", false)).toEqual(["delivered"]);
  });
  it("never reopens a closed order", () => {
    for (const status of ["delivered", "completed", "cancelled", "returned_to_store"]) {
      for (const action of ["accept", "ready", "complete", "cancel"] as const) expect(restaurantTransitions(status, action)).toEqual([]);
    }
  });
});