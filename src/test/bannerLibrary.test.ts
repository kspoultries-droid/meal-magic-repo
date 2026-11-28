import { describe, it, expect } from "vitest";
import { bannerOptionsFor, bannerGroupsFor } from "@/lib/bannerLibrary";
describe("banner library", () => {
  it("offers at most 12 options for grocery", () => { expect(bannerOptionsFor("grocery", "General").length).toBe(12); });
  it("puts meat banners first for a chicken shop", () => { expect(bannerOptionsFor("grocery", "Chicken & Meat")[0].id.startsWith("m-")).toBe(true); });
  it("puts shoe banners first for a shoe shop", () => { expect(bannerOptionsFor("wholesale", "Shoes")[0].id).toBe("w-shoes"); });
  it("offers more than 30 restaurant banners", () => { expect(bannerOptionsFor("restaurant", "General").length).toBeGreaterThan(30); });
  it("puts pizza group banners first for a pizza restaurant", () => { expect(bannerOptionsFor("restaurant", "Pizza")[0].group).toBe("pizza"); });
  it("puts bakery group banners first for a bakery", () => { expect(bannerOptionsFor("restaurant", "Bakery")[0].group).toBe("bakery"); });
  it("puts biryani banners first for a biryani restaurant", () => { expect(bannerOptionsFor("restaurant", "Biryani")[0].id.startsWith("r-biryani")).toBe(true); });
  it("offers restaurant groups for banner picker", () => { expect(bannerGroupsFor("restaurant").length).toBeGreaterThan(5); });
  it("offers no groups for grocery", () => { expect(bannerGroupsFor("grocery").length).toBe(0); });
});
