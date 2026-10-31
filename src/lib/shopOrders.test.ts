import { describe, expect, it } from "vitest";
import { availableShopQuantity, shopCustomerTotal, shopStatusStep } from "./shopOrders";
describe("Shop order rules", () => {
  it("does not invent stock for unknown quantity", () => expect(availableShopQuantity({ is_available: true, stock_qty: null })).toBeNull());
  it("bounds chosen option by its stock and the product stock", () => expect(availableShopQuantity({ stock_qty: 25 }, { stock_qty: 2 })).toBe(2));
  it("unavailable options cannot be ordered", () => expect(availableShopQuantity({ stock_qty: 25 }, { is_available: false, stock_qty: 2 })).toBe(0));
  it("does not re-add vendor-paid delivery to the customer's bill", () => expect(shopCustomerTotal(3800, 0, 80, "vendor")).toBe(3800));
  it("customer-paid order includes the actual fee", () => expect(shopCustomerTotal(3800, 0, 80, "customer")).toBe(3880));
  it("ready shop order is not already out for delivery", () => expect(shopStatusStep("ready_for_pickup", "assigned")).toBe(2));
  it("physical pickup begins delivery", () => expect(shopStatusStep("ready_for_pickup", "picked_up")).toBe(3));
  it("completion is the last customer stage", () => expect(shopStatusStep("delivered", "delivered")).toBe(4));
});