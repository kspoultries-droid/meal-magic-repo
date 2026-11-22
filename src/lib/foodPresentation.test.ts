import { describe, expect, it } from "vitest";
import { foodStartingPrice } from "./foodPresentation";

describe("food starting-price presentation", () => {
  it("includes the cheaper persisted size rather than advertising only the base", () => {
    expect(foodStartingPrice([{ price: 900, variants: [{ price: 450 }, { price: 1200 }] }])).toBe(450);
  });
  it("does not advertise a zero placeholder when sizes carry the real prices", () => {
    expect(foodStartingPrice([{ price: 0, variants: [{ price: 650 }] }])).toBe(650);
  });
  it("does not invent a starting price for an empty or invalid menu", () => {
    expect(foodStartingPrice([])).toBeNull();
    expect(foodStartingPrice([{ price: NaN }, { price: -10 }, { price: 0 }])).toBeNull();
  });
  it("ignores malformed variant JSON without crashing the restaurant list", () => {
    expect(foodStartingPrice([{ price: 300, variants: "invalid" }])).toBe(300);
    expect(foodStartingPrice([{ price: 300, variants: [null, {}, { price: 250 }] }])).toBe(250);
  });
});