import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CartDrawer from "@/components/CartDrawer";
import BoughtTogether from "@/components/checkout/BoughtTogether";
import { CartProvider, useCart } from "@/contexts/CartContext";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "customer" } }) }));
vi.mock("@/contexts/LanguageContext", () => ({ useLanguage: () => ({ t: (key: string) => key }) }));
vi.mock("react-router-dom", () => ({ useNavigate: () => vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), warning: vi.fn() } }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => {
      const query = {
        select: () => query, eq: () => query, order: () => query,
        limit: () => Promise.resolve({ data: [{ id: "suggestion", name: "Suggested product", price: 50, image_url: "" }] }),
      };
      return query;
    },
  },
}));

let cart: ReturnType<typeof useCart>;
function Probe() { cart = useCart(); return null; }
afterEach(cleanup);

describe("suggestions preserve Bazar packages", () => {
  it.each(["drawer", "checkout"])("keeps both shops after adding a %s suggestion", async (surface) => {
    render(<CartProvider><Probe />{surface === "drawer" ? <CartDrawer /> :
      <BoughtTogether source="grocery" sourceId="shop-a" sourceName="Shop A" bazar />}</CartProvider>);
    act(() => {
      cart.addItems([
        { id: "product-a", name: "Product A", price: 100, image: "", restaurant: "Shop A", source: "grocery", sourceId: "shop-a", bazar: true, quantity: 1 },
        { id: "product-b", name: "Product B", price: 200, image: "", restaurant: "Shop B", source: "grocery", sourceId: "shop-b", bazar: true, quantity: 1 },
      ]);
      cart.setIsOpen(true);
    });
    const suggestion = await screen.findByText("Suggested product");
    const container = surface === "drawer" ? suggestion.closest("button")?.parentElement : suggestion.parentElement;
    if (!container) throw new Error("Suggestion missing");
    const addButton = container.querySelector("button");
    if (!addButton) throw new Error("Suggestion add button missing");
    await act(async () => { fireEvent.click(addButton); });
    expect(cart.totalItems).toBe(3);
    expect(cart.items.find((i) => i.menu_item_id === "suggestion")).toMatchObject({ sourceId: "shop-a", bazar: true });
    expect(new Set(cart.items.map((i) => i.sourceId)).size).toBe(2);
    expect(cart.items.every((i) => i.source === "grocery" && i.bazar)).toBe(true);
    expect(cart.items.filter((i) => i.sourceId === "shop-a").map((i) => i.menu_item_id)).toEqual(["product-a", "suggestion"]);
    expect(cart.items.filter((i) => i.sourceId === "shop-b").map((i) => i.menu_item_id)).toEqual(["product-b"]);
  });
});