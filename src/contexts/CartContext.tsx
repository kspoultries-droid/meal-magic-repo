import React, { createContext, useContext, useState, useCallback } from "react";
import { toast } from "sonner";

export interface CartItemOption {
  group_id: string;
  group: string;
  choice_id: string;
  choice: string;
  price_delta: number;
}

export interface CartItem {
  id: string; // composite line id: menu_item_id[|variant_id][|choice_ids]
  menu_item_id: string;
  name: string;
  restaurant: string;
  price: number; // unit price (after variant + options)
  quantity: number;
  image: string;
  source?: "restaurant" | "grocery";
  sourceId?: string;
  variant_id?: string | null;
  variant_label?: string | null;
  option_ids?: string[];
  options?: CartItemOption[];
}

export type AddItemInput = Omit<CartItem, "quantity" | "id"> & {
  id?: string;
  quantity?: number;
};

interface CartContextType {
  items: CartItem[];
  addItem: (item: AddItemInput) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const buildLineId = (item: AddItemInput) => {
  const opts = [...(item.option_ids || [])].sort().join(",");
  return [item.menu_item_id, item.variant_id || "", opts].join("|");
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const addItem = useCallback((raw: AddItemInput) => {
    const lineId = raw.id || buildLineId(raw);
    const qty = raw.quantity ?? 1;
    const item: CartItem = {
      ...raw,
      id: lineId,
      quantity: qty,
      option_ids: raw.option_ids || [],
      options: raw.options || [],
    };
    setItems((prev) => {
      const first = prev[0];
      if (first) {
        const sameSource = (first.source || "restaurant") === (item.source || "restaurant");
        const sameShop = (first.sourceId || first.restaurant) === (item.sourceId || item.restaurant);
        if (!sameSource || !sameShop) {
          toast.error("کارٹ صرف ایک شاپ سے ہو سکتا ہے — پرانا صاف کر کے نیا شامل کیا گیا", {
            id: "cart-swap", duration: 2500,
          });
          return [item];
        }
      }
      const existing = prev.find((i) => i.id === lineId);
      if (existing) {
        return prev.map((i) => i.id === lineId ? { ...i, quantity: i.quantity + qty } : i);
      }
      return [...prev, item];
    });
    toast.success(`${item.name} کارٹ میں شامل ✓`, { id: "cart-add", duration: 1500 });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    } else {
      setItems((prev) => prev.map((i) => i.id === id ? { ...i, quantity } : i));
    }
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice, isOpen, setIsOpen }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
