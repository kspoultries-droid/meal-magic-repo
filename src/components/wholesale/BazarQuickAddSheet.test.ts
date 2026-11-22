import { describe, expect, it } from "vitest";
import { clampQty, variantPrice } from "./BazarQuickAddSheet";

describe("Bazar quick add", () => {
  it("allows a single piece when the vendor set no minimum", () => expect(clampQty(0, null, null)).toBe(1));
  it("never goes below the vendor minimum quantity", () => expect(clampQty(2, 6, null)).toBe(6));
  it("never exceeds available stock", () => expect(clampQty(20, 1, 8)).toBe(8));
  it("uses wholesale price plus the option's price difference", () => expect(variantPrice({ price: 500, discount_price: 450, wholesale_price: 400 }, { price_delta: 50 })).toBe(450));
});
