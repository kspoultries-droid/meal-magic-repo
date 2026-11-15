import { describe, it, expect } from "vitest";
import { buildReorder } from "@/lib/reorder";
const p = { id: "a", name: "Dal", price: 330, discount_price: 300, is_available: true, store_id: "s" };
describe("reorder", () => {
  it("uses today's price, not the old one", () => { expect(buildReorder([{ id: "a", name: "Dal", quantity: 2 }], [p]).add[0].unitPrice).toBe(300); });
  it("skips items no longer available", () => { expect(buildReorder([{ id: "a", name: "Dal", quantity: 1 }], [{ ...p, is_available: false }]).skipped).toEqual(["Dal"]); });
  it("skips size/colour lines so the customer picks again", () => { expect(buildReorder([{ id: "a", name: "Suit", quantity: 1, variant_id: "Red|M" }], [p]).add).toHaveLength(0); });
  it("caps quantity at current stock", () => { expect(buildReorder([{ id: "a", name: "Dal", quantity: 5 }], [{ ...p, stock_qty: 3 }]).add[0].quantity).toBe(3); });
});
