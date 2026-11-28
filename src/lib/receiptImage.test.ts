import { describe, it, expect } from "vitest";
import { receiptLines } from "./receiptImage";
const order = { id: "abcdef12", total_amount: 1170, delivery_fee: 100, payment_method: "cod", order_items: [{ name: "Biryani", quantity: 2, price: 535 }] };
describe("receiptLines", () => {
  it("kitchen slip has no prices", () => { expect(receiptLines(order, "kitchen").some(l => l.right)).toBe(false); });
  it("bill shows line total and grand total", () => {
    const L = receiptLines(order, "bill");
    expect(L.find(l => l.text.startsWith("2×"))?.right).toBe("1070");
    expect(L.find(l => l.text === "کل")?.right).toBe("Rs 1170");
  });
});
