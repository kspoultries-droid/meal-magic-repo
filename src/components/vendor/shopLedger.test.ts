import { describe, it, expect } from "vitest";
import { groupSalesByDay, saleBucket } from "./shopLedger";

describe("shop ledger", () => {
  it("separates cancelled from delivered", () => {
    expect(saleBucket("cancelled")).toBe("cancelled");
    expect(saleBucket("delivered")).toBe("sold");
    expect(saleBucket("picking")).toBe("active");
  });
  it("daily share = goods minus server commission", () => {
    const orders = [
      { id: "a", status: "delivered", created_at: "2026-11-13T10:00:00Z", items: [{ price: 3500, quantity: 1 }] },
      { id: "b", status: "delivered", created_at: "2026-11-13T12:00:00Z", items: [{ price: 3800, quantity: 1 }] },
    ];
    const [d] = groupSalesByDay(orders, { a: { commission: 525, net: 2975 }, b: { commission: 570, net: 3230 } });
    expect(d.items).toBe(7300);
    expect(d.commission).toBe(1095);
    expect(d.net).toBe(6205);
  });
});
