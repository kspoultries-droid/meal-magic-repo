import { act, cleanup, renderHook, render, screen, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import { CartProvider, useCart, buildLineId, type AddItemInput } from "@/contexts/CartContext";
import FloatingCartBar from "@/components/cart/FloatingCartBar";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "test-account" } }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), warning: vi.fn() } }));
vi.mock("@/lib/i18n/tr", () => ({ tr: (en: string) => en }));
afterEach(cleanup);
const apple: AddItemInput = { id: "apple", name: "Apple", price: 100, restaurant: "Shop", source: "grocery", sourceId: "shop", image: "" };
const rice: AddItemInput = { ...apple, id: "rice", name: "Rice", price: 250, quantity: 2 };
const wrapper = ({ children }: { children: React.ReactNode }) => <CartProvider>{children}</CartProvider>;

describe("cart selection", () => {
  it("only totals selected quantities and preserves unticked lines after checkout", () => {
    const { result } = renderHook(useCart, { wrapper });
    act(() => result.current.addItems([{ ...apple, quantity: 1 }, rice]));
    act(() => result.current.setSelected([buildLineId(apple)], false));
    expect(result.current.selectedTotal).toBe(500);
    expect(result.current.totalPrice).toBe(600);
    act(() => result.current.clearSelected());
    expect(result.current.items.map(i => i.menu_item_id)).toEqual(["apple"]);
    expect(result.current.selectedItems).toHaveLength(0);
  });
  it("explicit addition including Buy now reselects an unticked existing line", () => {
    const { result } = renderHook(useCart, { wrapper });
    act(() => result.current.addItem(apple));
    act(() => result.current.setSelected([buildLineId(apple)], false));
    act(() => result.current.addItem(apple));
    expect(result.current.selectedTotal).toBe(200);
    expect(result.current.selectedItems[0]?.quantity).toBe(2);
  });
  it.each(["remove", "zero", "clear"])("%s clears stale exclusions before the same product is added", (method) => {
    const { result } = renderHook(useCart, { wrapper });
    act(() => result.current.addItem(apple));
    act(() => result.current.setSelected([buildLineId(apple)], false));
    act(() => {
      if (method === "remove") result.current.removeItem(buildLineId(apple));
      else if (method === "zero") result.current.updateQuantity(buildLineId(apple), 0);
      else result.current.clearCart();
    });
    expect(result.current.isSelected(buildLineId(apple))).toBe(true);
    act(() => result.current.addItem(apple));
    expect(result.current.selectedTotal).toBe(100);
  });
  it("batch additions reselect only added lines", () => {
    const { result } = renderHook(useCart, { wrapper });
    act(() => result.current.addItems([{ ...apple, quantity: 1 }, rice]));
    act(() => result.current.setSelected(result.current.items.map(i => i.id), false));
    act(() => result.current.addItems([{ ...apple, quantity: 1 }]));
    expect(result.current.selectedItems.map(i => i.menu_item_id)).toEqual(["apple"]);
    expect(result.current.selectedTotal).toBe(200);
  });
  it("floating checkout cannot navigate with no selection and navigates when selected", () => {
    const Probe = () => {
      const cart = useCart();
      const location = useLocation();
      return <><button onClick={() => cart.addItem(apple)}>add</button><button onClick={() => cart.setSelected([buildLineId(apple)], false)}>untick</button><button onClick={() => cart.setSelected([buildLineId(apple)], true)}>tick</button><output data-testid="path">{location.pathname}</output><FloatingCartBar /></>;
    };
    render(<CartProvider><MemoryRouter initialEntries={["/grocery/shop"]}><Probe /></MemoryRouter></CartProvider>);
    fireEvent.click(screen.getByText("add"));
    fireEvent.click(screen.getByText("untick"));
    fireEvent.click(screen.getByRole("button", { name: "Checkout" }));
    expect(screen.getByTestId("path").textContent).toBe("/grocery/shop");
    fireEvent.click(screen.getByText("tick"));
    fireEvent.click(screen.getByRole("button", { name: "Checkout" }));
    expect(screen.getByTestId("path").textContent).toBe("/checkout");
  });
});