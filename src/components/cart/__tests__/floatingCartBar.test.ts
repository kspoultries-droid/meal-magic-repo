import { describe, it, expect } from "vitest";
import { isShopPage } from "../FloatingCartBar";
describe("isShopPage", () => {
  it("shows inside shops", () => { for (const p of ["/restaurant/a", "/grocery/b", "/bazar/c", "/store/x"]) expect(isShopPage(p)).toBe(true); });
  it("hides on general pages", () => { for (const p of ["/", "/grocery", "/wholesale", "/profile", "/services", "/restaurant-dashboard"]) expect(isShopPage(p)).toBe(false); });
});
