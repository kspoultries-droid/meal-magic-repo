import { describe, expect, it } from "vitest";
import { discoverGroceryProducts } from "./groceryDiscovery";
import { matchesSearch } from "./searchMatch";

describe("grocery discovery", () => {
  const rows = [
    { id: "rice-local", store_id: "local", category: "Atta" },
    { id: "milk-local", store_id: "local", category: "Dairy" },
    { id: "rice-far", store_id: "far", category: "Atta & Rice" },
  ];
  it("keeps category rails relevant using existing aliases", () => {
    expect(discoverGroceryProducts(rows, new Set(["local", "far"]), "Atta & Rice").map(p => p.id)).toEqual(["rice-local", "rice-far"]);
  });
  it("does not show products from excluded shops", () => {
    expect(discoverGroceryProducts(rows, new Set(["local"]), null).map(p => p.id)).toEqual(["rice-local", "milk-local"]);
  });
  it("returns no unrelated promotions for an empty category", () => {
    expect(discoverGroceryProducts(rows, new Set(["local"]), "Flowers")).toEqual([]);
  });
  it("finds cheeni in Urdu product names within eligible shops", () => {
    const candidates = [
      { id: "sugar-local", name: "چینی", store_id: "local", category: "General" },
      { id: "sugar-far", name: "چینی", store_id: "far", category: "General" },
    ];
    expect(discoverGroceryProducts(candidates, new Set(["local"]), "General")
      .filter(p => matchesSearch("cheeni", p.name, p.category)).map(p => p.id)).toEqual(["sugar-local"]);
  });
  it("finds misspelled suger beyond the category-only preview pool", () => {
    const candidates = [
      ...Array.from({ length: 120 }, (_, i) => ({ id: `other-${i}`, name: "Milk", store_id: "local", category: "General" })),
      { id: "sugar", name: "Sugar", store_id: "local", category: "General" },
    ];
    expect(discoverGroceryProducts(candidates, new Set(["local"]), null)
      .filter(p => matchesSearch("suger", p.name, p.category)).map(p => p.id)).toEqual(["sugar"]);
  });
});