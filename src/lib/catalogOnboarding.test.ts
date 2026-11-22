import { describe, expect, it } from "vitest";
import { catalogImages, sameCatalogProduct, starterPack, uniqueCatalogItems, validBarcode, validItemNumbers } from "./catalogOnboarding";

describe("safe shop onboarding", () => {
  it("prepares at most 100 existing grocery items without prices", () => {
    const items = Array.from({ length: 150 }, (_, i) => ({ id: String(i), name: `Rice ${i}`, category: "General" }));
    expect(starterPack(items, [], "General")).toHaveLength(100);
    expect(starterPack(items, [], "General")[0]).not.toHaveProperty("price");
  });
  it("does not add products already linked to the catalog", () => {
    expect(uniqueCatalogItems([{ id: "catalog-1", name: "Milk" }], [{ catalog_item_id: "catalog-1", name: "Renamed milk" }])).toEqual([]);
  });
  it("retains distinct pack sizes and distinct vendor listings", () => {
    expect(sameCatalogProduct({ name: "Tea", unit: "250g" }, { name: "Tea", unit: "500g" })).toBe(false);
    expect(uniqueCatalogItems([{ name: "Tea", unit: "250g" }, { name: " tea ", unit: "250g" }])).toHaveLength(1);
  });
  it("never copies unverified imagery", () => {
    expect(catalogImages({ image_verified: false, image_url: "category-photo" })).toEqual([]);
    expect(catalogImages({ image_verified: true, images: ["actual-pack"] })).toEqual(["actual-pack"]);
  });
  it("only prepares the specialist shop category", () => {
    expect(starterPack([{ name: "Milk", category: "Dairy" }, { name: "Rice", category: "Atta & Rice" }, { name: "Watch", category: "Electronics" }], [], "Dairy")).toEqual([{ name: "Milk", category: "Dairy" }]);
  });
  it("validates a real GTIN checksum without stripping invalid characters", () => {
    expect(validBarcode("4006381333931")).toBe(true);
    expect(validBarcode("4006381333932")).toBe(false);
    expect(validBarcode("abc4006381333931")).toBe(false);
  });
  it("requires real positive prices and integral nonnegative stock", () => {
    expect(validItemNumbers("160", "150", "10")).toBe(true);
    expect(validItemNumbers("0", "", "10")).toBe(false);
    expect(validItemNumbers("160", "170", "10")).toBe(false);
    expect(validItemNumbers("160", "", "1.5")).toBe(false);
    expect(validItemNumbers("Infinity", "", "")).toBe(false);
  });
});