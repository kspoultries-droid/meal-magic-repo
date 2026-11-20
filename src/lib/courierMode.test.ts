import { describe, it, expect } from "vitest";
import { isCourierShopOrder } from "./courier";

describe("isCourierShopOrder", () => {
  it("courier delivery method uses courier view", () => expect(isCourierShopOrder("grocery_cart", { delivery_method: "courier" })).toBe(true));
  it("local rider shop order keeps rider view", () => expect(isCourierShopOrder("grocery_cart", { delivery_method: "local_rider" })).toBe(false));
  it("food orders never use courier view", () => expect(isCourierShopOrder("food", { delivery_method: "courier" })).toBe(false));
  it("existing tracking number marks courier", () => expect(isCourierShopOrder("grocery_cart", { delivery_method: "local_rider", tracking_number: "CN1" })).toBe(true));
});
