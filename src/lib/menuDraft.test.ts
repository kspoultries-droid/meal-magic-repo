import { describe, expect, it } from "vitest";
import { validateMenuDraft } from "./menuDraft";

describe("food menu draft safety", () => {
  it("accepts the existing Pizza price without changing it", () => {
    expect(validateMenuDraft({ name: "Peperoni Pizza", price: "1550" }, "restaurant")).toBeNull();
  });
  it("requires a restaurant", () => {
    expect(validateMenuDraft({ name: "Pizza", price: "1550" }, "")).toBe("restaurant");
  });
  it("rejects whitespace-only names", () => {
    expect(validateMenuDraft({ name: "  ", price: "1550" }, "restaurant")).toBe("name");
  });
  it.each(["", " ", "0", "-1", "Infinity", "NaN", "wrong"])("rejects invalid price %s", (price) => {
    expect(validateMenuDraft({ name: "Pizza", price }, "restaurant")).toBe("price");
  });
});