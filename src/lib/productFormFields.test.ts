import { describe, it, expect } from "vitest";
import { isFreshFoodCategory } from "./productFormFields";
describe("isFreshFoodCategory", () => {
  it("bakery is food", () => expect(isFreshFoodCategory("Bakery")).toBe(true));
  it("electronics is not food", () => expect(isFreshFoodCategory("Electronics")).toBe(false));
  it("empty is not food", () => expect(isFreshFoodCategory("")).toBe(false));
});
