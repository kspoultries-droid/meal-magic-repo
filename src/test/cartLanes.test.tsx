import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CartProvider, useCart, type AddItemInput } from "@/contexts/CartContext";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "lane-account" } }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), warning: vi.fn() } }));
vi.mock("@/lib/i18n/tr", () => ({ tr: (en: string) => en }));
afterEach(() => { cleanup(); localStorage.clear(); });
const wrapper = ({ children }: { children: React.ReactNode }) => <CartProvider>{children}</CartProvider>;
const watch: AddItemInput = { id: "watch", name: "Watch", price: 3000, restaurant: "Karachi Shop", source: "grocery", sourceId: "k", bazar: true, image: "" };
const burger: AddItemInput = { id: "burger", name: "Burger", price: 500, restaurant: "Bake House", source: "restaurant", sourceId: "b", image: "" };
const pizza: AddItemInput = { ...burger, id: "pizza", restaurant: "Gym Bar", sourceId: "g" };

describe("food and shop carts", () => {
  it("adding food keeps saved Bazar items and checks out only food", () => {
    const { result } = renderHook(useCart, { wrapper });
    act(() => { result.current.addItem(watch); });
    act(() => { result.current.addItem(burger); });
    expect(result.current.items.map((i) => i.menu_item_id).sort()).toEqual(["burger", "watch"]);
    expect(result.current.selectedItems.map((i) => i.menu_item_id)).toEqual(["burger"]);
    act(() => result.current.clearSelected());
    expect(result.current.items.map((i) => i.menu_item_id)).toEqual(["watch"]);
  });
  it("a second restaurant is still refused within the food cart", () => {
    const { result } = renderHook(useCart, { wrapper });
    act(() => { result.current.addItem(burger); });
    let ok = true;
    act(() => { ok = result.current.addItem(pizza); });
    expect(ok).toBe(false);
    expect(result.current.items.map((i) => i.menu_item_id)).toEqual(["burger"]);
  });
});
