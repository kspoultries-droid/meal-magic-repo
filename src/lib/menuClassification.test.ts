import { describe, it, expect } from "vitest";
import { classifyMenuCategory } from "../../supabase/functions/_shared/menuCategories";
import { featuredMenuIds } from "./featuredMenu";

describe("specific restaurant menu categories", () => {
  it("places Paprika burgers under Burgers instead of Fast Food", () => {
    expect(classifyMenuCategory("Double Zinger Burger", "Fast Food")).toBe("Burgers");
    expect(classifyMenuCategory("Fish Burger (Seasonal)", "Fast Food")).toBe("Burgers");
  });
  it("places fries under Fries", () => {
    expect(classifyMenuCategory("Premium Fries", "Fast Food")).toBe("Fries");
  });
  it("separates rolls and wings", () => {
    expect(classifyMenuCategory("B.B.Q. Tandoori, Hot & Spicy Roll", "Fast Food")).toBe("Rolls & Wraps");
    expect(classifyMenuCategory("5 Pcs Bar B Q Wings", "Fast Food")).toBe("Wings & Fried Chicken");
  });
  it("keeps the manually added biryani category", () => {
    expect(classifyMenuCategory("Chicken Biryani", "Fast Food")).toBe("Biryani & Rice");
  });
});
describe("large main dish photographs", () => {
  const items = Array.from({ length: 6 }, (_, i) => ({ id: String(i), image_url: "photo.webp" }));
  it("never features more than 4 photographs", () => {
    expect([...featuredMenuIds(items)]).toEqual(["0", "1", "2", "3"]);
  });
  it("uses the owner's chosen dishes rather than the first rows", () => {
    expect([...featuredMenuIds(items, ["4", "5"])]).toEqual(["4", "5"]);
  });
});