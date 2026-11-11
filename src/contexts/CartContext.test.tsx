import { act, render, screen, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CartProvider, useCart, type AddItemInput } from "./CartContext";
import { pendingShopping } from "@/lib/shoppingAccess";
const auth = vi.hoisted(() => ({ user: null as { id: string } | null }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => auth }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), warning: vi.fn() } }));
let cart: ReturnType<typeof useCart>;
function Probe() { cart = useCart(); return <span data-testid="count">{cart.totalItems}</span>; }
const item: AddItemInput = { id: "rice", name: "Rice", price: 100, restaurant: "Shop", image: "", source: "grocery", sourceId: "shop" };
beforeEach(() => { auth.user = null; sessionStorage.clear(); });
afterEach(cleanup);
describe("sign in before cart", () => {
  it("does not add a guest item and remembers it for login", () => {
    render(<CartProvider><Probe /></CartProvider>);
    act(() => { expect(cart.addItem(item)).toBe(false); });
    expect(cart.totalItems).toBe(0); expect(pendingShopping()?.items[0].id).toBe("rice");
  });
  it("also blocks guest batch additions", () => {
    render(<CartProvider><Probe /></CartProvider>);
    act(() => cart.addItems([{ ...item, quantity: 2 }]));
    expect(cart.totalItems).toBe(0); expect(pendingShopping()?.items[0].quantity).toBe(2);
  });
  it("adds for signed-in users and clears at logout", () => {
    auth.user = { id: "customer" };
    const view = render(<CartProvider><Probe /></CartProvider>);
    act(() => { expect(cart.addItem(item)).toBe(true); });
    expect(cart.totalItems).toBe(1);
    auth.user = null; view.rerender(<CartProvider><Probe /></CartProvider>);
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });
  it("clears on account switch", () => {
    auth.user = { id: "first" };
    const view = render(<CartProvider><Probe /></CartProvider>);
    act(() => cart.addItem(item));
    auth.user = { id: "second" }; view.rerender(<CartProvider><Probe /></CartProvider>);
    expect(cart.totalItems).toBe(0);
  });
});describe("bazar multi-shop cart", () => {
  it("lets bazar items from two shops share one cart", () => {
    auth.user = { id: "c" };
    render(<CartProvider><Probe /></CartProvider>);
    act(() => { cart.addItem({ ...item, sourceId: "a", bazar: true }); });
    act(() => { expect(cart.addItem({ ...item, id: "kurta", sourceId: "b", bazar: true })).toBe(true); });
    expect(cart.totalItems).toBe(2);
  });
  it("still keeps local grocery to one shop", () => {
    auth.user = { id: "c" };
    render(<CartProvider><Probe /></CartProvider>);
    act(() => { cart.addItem({ ...item, sourceId: "a" }); });
    act(() => { expect(cart.addItem({ ...item, id: "milk", sourceId: "b" })).toBe(false); });
    expect(cart.totalItems).toBe(1);
  });
});
