import { describe, it, expect } from "vitest";
import { bannerOptionsFor } from "@/lib/bannerLibrary";
describe("banner library", () => {
  it("offers at most 12 options", () => { expect(bannerOptionsFor("grocery", "General").length).toBe(12); });
  it("puts meat banners first for a chicken shop", () => { expect(bannerOptionsFor("grocery", "Chicken & Meat")[0].id.startsWith("m-")).toBe(true); });
  it("puts shoe banners first for a shoe shop", () => { expect(bannerOptionsFor("wholesale", "Shoes")[0].id).toBe("w-shoes"); });
});
