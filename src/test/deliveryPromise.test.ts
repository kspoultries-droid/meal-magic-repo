import { describe, it, expect } from "vitest";
import { deliveryPromise } from "@/lib/deliveryPromise";
describe("deliveryPromise", () => {
  it("same city shows 2–4 hours", () => expect(deliveryPromise("k", "k", true).kind).toBe("same_city"));
  it("other city with nationwide shipping shows courier days", () => expect(deliveryPromise("ryk", "k", true).ur).toContain("2–4 دن"));
  it("other city without nationwide shipping warns local only", () => expect(deliveryPromise("ryk", "k", false, "Karachi").kind).toBe("local_only"));
  it("no buyer city shows both", () => expect(deliveryPromise(null, "k", true, "Karachi").ur).toContain("Karachi"));
});
