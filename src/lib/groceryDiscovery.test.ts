import { describe, expect, it } from "vitest";
import { discoverGroceryProducts } from "./groceryDiscovery";

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
});