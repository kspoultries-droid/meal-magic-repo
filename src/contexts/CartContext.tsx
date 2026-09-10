import React, { createContext, useContext, useState, useCallback } from "react";
import { toast } from "sonner";

export interface CartItemOption {
  group_id: string;
  group: string;
  choice_id: string;
  choice: string;
  price_delta: number;
}

export interface CartVoucher {
  code: string;
  discount: number;
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
  weight_kg?: number | null;
  weight?: string | null;
  variant_id?: string | null;
  variant_label?: string | null;
  option_ids?: string[];
  options?: CartItemOption[];
  line_type?: "main" | "addon";
  choice_id?: string | null;
}

export type AddItemInput = Omit<CartItem, "quantity" | "id" | "menu_item_id"> & {
  id?: string;
  menu_item_id?: string;
  quantity?: number;
};

interface CartContextType {
  items: CartItem[];
  addItem: (item: AddItemInput) => void;
  addItems: (items: AddItemInput[]) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  voucher: CartVoucher | null;
  setVoucher: (voucher: CartVoucher | null) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const buildLineId = (item: AddItemInput) => {
  const opts = [...(item.option_ids || [])].sort().join(",");
  const mid = item.menu_item_id || item.id || "";
  return [mid, item.line_type || "main", item.variant_id || "", item.choice_id || "", opts].join("|");
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [voucher, setVoucher] = useState<CartVoucher | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const mergeItems = useCallback((previous: CartItem[], rawItems: AddItemInput[]) => {
    let next = [...previous];
    for (const raw of rawItems) {
      const menuItemId = raw.menu_item_id || raw.id || "";
      const lineId = buildLineId({ ...raw, menu_item_id: menuItemId });
      const qty = raw.quantity ?? 1;
      const item: CartItem = {
        ...raw,
        menu_item_id: menuItemId,
        id: lineId,
        quantity: qty,
        option_ids: raw.option_ids || [],
        options: raw.options || [],
      };
      const first = next[0];
      if (first) {
        const sameSource = (first.source || "restaurant") === (item.source || "restaurant");
        const sameShop = (first.sourceId || first.restaurant) === (item.sourceId || item.restaurant);
        if (!sameSource || !sameShop) next = [];
      }
      const existing = next.find((value) => value.id === lineId);
      next = existing
        ? next.map((value) => value.id === lineId ? { ...value, quantity: value.quantity + qty } : value)
        : [...next, item];
    }
    return next;
  }, []);

  const addItem = useCallback((raw: AddItemInput) => {
    const menuItemId = raw.menu_item_id || raw.id || "";
    const lineId = buildLineId({ ...raw, menu_item_id: menuItemId });
    const qty = raw.quantity ?? 1;
    const item: CartItem = {
      ...raw,
      menu_item_id: menuItemId,
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
      return mergeItems(prev, [item]);
    });
    toast.success(`${item.name} کارٹ میں شامل ✓`, { id: "cart-add", duration: 1500 });
  }, [mergeItems]);

  const addItems = useCallback((rawItems: AddItemInput[]) => {
    const validItems = rawItems.filter((item) => (item.quantity ?? 0) > 0);
    if (validItems.length === 0) return;
    setItems((prev) => mergeItems(prev, validItems));
    toast.success(`${validItems.length} انتخاب کارٹ میں شامل ہو گئے ✓`, { id: "cart-add-batch", duration: 1600 });
  }, [mergeItems]);

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

  const clearCart = useCallback(() => {
    setItems([]);
    setVoucher(null);
  }, []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, addItems, removeItem, updateQuantity, clearCart, totalItems, totalPrice, voucher, setVoucher, isOpen, setIsOpen }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
