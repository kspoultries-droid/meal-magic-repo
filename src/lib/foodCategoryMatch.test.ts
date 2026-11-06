import { describe, expect, it } from "vitest";
import { matchesFoodCategory } from "./foodCategoryMatch";

describe("available menu category matching", () => {
  it("finds biryani from an item even without restaurant cuisines", () => {
    expect(matchesFoodCategory("Biryani", ["Chicken Biryani", "Biryani & Rice"])).toBe(true);
    expect(matchesFoodCategory("Biryani", ["Grilled Burger", "Fast Food"])).toBe(false);
  });
  it("matches singular burger and Urdu category names", () => {
    expect(matchesFoodCategory("Burgers", ["Crispy Chicken Burger"])).toBe(true);
    expect(matchesFoodCategory("Biryani", ["چکن بریانی"])).toBe(true);
  });
});