import { describe, expect, it } from "vitest";
import { parseCsv, rowsToProducts, productsToCsv } from "./inventoryImport";

describe("inventory import", () => {
  it("reads quoted CSV cells", () => {
    expect(parseCsv('name,price\n"Rice, 5kg",1200\n')).toEqual([["name", "price"], ["Rice, 5kg", "1200"]]);
  });

  it("each shop sets its own price and keeps a valid discount", () => {
    const { products, errors } = rowsToProducts([["name", "price", "discount_price"], ["Sugar 1kg", "160", "150"]], "store-1", () => "new");
    expect(errors).toEqual([]);
    expect(products[0]).toMatchObject({ store_id: "store-1", price: 160, discount_price: 150, is_special_offer: true, is_available: true });
  });

  it("drops a discount that is not lower than the price", () => {
    const { products } = rowsToProducts([["name", "price", "discount_price"], ["Ghee", "500", "600"]], "s", () => "x");
    expect(products[0].discount_price).toBeNull();
  });

  it("rejects rows without a valid price", () => {
    const { products, errors } = rowsToProducts([["name", "price"], ["Tea", ""]], "s");
    expect(products).toHaveLength(0);
    expect(errors).toHaveLength(1);
  });

  it("keeps existing item id so re-import updates instead of duplicating", () => {
    const id = "11111111-2222-4333-8444-555555555555";
    const { products } = rowsToProducts([["id", "name", "price", "available"], [id, "Milk", "220", "no"]], "s", () => "new");
    expect(products[0].id).toBe(id);
    expect(products[0].is_available).toBe(false);
  });

  it("neutralizes formula cells on export", () => {
    expect(productsToCsv([{ id: "1", name: "=HACK()", price: 1 }])).toContain("'=HACK()");
  });
});
