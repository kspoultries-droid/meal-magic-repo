import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ShoppingBag, Package, Store, ReceiptText, ChevronLeft, Truck } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { img } from "@/lib/imageUrl";

/** Clean marketplace-style cart: one shop header, list rows, add-more rail and a sticky checkout bar. */
const CartDrawer = () => {
  const { items, isOpen, setIsOpen, updateQuantity, removeItem, clearCart, totalItems, totalPrice } = useCart();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [recommended, setRecommended] = useState<any[]>([]);
  const go = (path: string) => { setIsOpen(false); navigate(path); };

  useEffect(() => {
    const sourceId = items[0]?.sourceId;
    if (!isOpen || !sourceId || items[0]?.source !== "grocery") { setRecommended([]); return; }
    supabase.from("grocery_products").select("id,name,price,discount_price,image_url")
      .eq("store_id", sourceId).eq("is_available", true).limit(8)
      .then(({ data }) => setRecommended((data || []).filter((p: any) => !items.some((i) => i.menu_item_id === p.id))));
  }, [isOpen, items]);

  const shop = items[0]?.restaurant;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="top-0 bottom-auto flex h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] w-full flex-col gap-0 bg-muted/40 p-0 sm:max-w-md">
        <SheetHeader className="border-b bg-card px-4 py-3 text-start">
          <SheetTitle className="flex items-center gap-2 pe-8 text-base font-extrabold">
            <ShoppingBag className="size-5 text-primary" />
            {t("cart.title")}
            {totalItems > 0 && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{totalItems}</span>}
            <button type="button" onClick={() => go("/my-orders")} className="ms-auto flex items-center gap-1 text-xs font-semibold text-muted-foreground">
              <ReceiptText className="size-4" /> {t("common.orders")}
            </button>
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <div className="mb-4 grid size-20 place-items-center rounded-full bg-card shadow-soft"><ShoppingBag className="size-9 text-muted-foreground" /></div>
            <p className="text-base font-bold">{t("cart.empty")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("cart.startAdding")}</p>
            <div className="mt-5 flex gap-2">
              <Button onClick={() => go("/")}>{t("common.food" as any) === "common.food" ? "Food" : t("common.food" as any)}</Button>
              <Button variant="outline" onClick={() => go("/grocery")}>Grocery</Button>
              <Button variant="outline" onClick={() => go("/wholesale")}>{t("cart.browseBazar")}</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto p-3">
              <section className="overflow-hidden rounded-xl border bg-card">
                <div className="flex items-center gap-2 border-b px-3 py-2.5">
                  <Store className="size-4 text-primary" />
                  <p className="min-w-0 flex-1 truncate text-sm font-bold">{shop}</p>
                  <button type="button" onClick={clearCart} className="text-xs font-semibold text-muted-foreground hover:text-destructive">{t("cart.clear")}</button>
                </div>
                <ul className="divide-y">
                  {items.map((item) => (
                    <li key={item.id} className="flex gap-3 p-3">
                      <div className="size-[4.5rem] shrink-0 overflow-hidden rounded-lg bg-muted">
                        {item.image ? <img src={img(item.image, 160)} alt={item.name} loading="lazy" className="size-full object-cover" /> : <Package className="m-auto mt-6 size-6 text-muted-foreground" />}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start gap-2">
                          <p className="line-clamp-2 flex-1 text-sm font-semibold leading-snug">{item.name}</p>
                          <button type="button" aria-label={t("cart.remove")} onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
                        </div>
                        {(item.variant_label || (item.options && item.options.length > 0)) && <p className="truncate text-[11px] text-muted-foreground">{item.variant_label || item.options?.map((o) => o.choice).join(" • ")}</p>}
                        <div className="mt-auto flex items-end justify-between pt-1.5">
                          <div>
                            <p className="text-sm font-extrabold">Rs {(item.price * item.quantity).toLocaleString()}</p>
                            {item.quantity > 1 && <p className="text-[10px] text-muted-foreground">Rs {item.price.toLocaleString()} × {item.quantity}</p>}
                          </div>
                          <div className="flex h-8 items-center rounded-lg border">
                            <button type="button" aria-label={t("cart.decrease")} onClick={() => updateQuantity(item.id, item.quantity - 1)} className="grid h-full w-8 place-items-center text-muted-foreground"><Minus className="size-3.5" /></button>
                            <span className="w-7 text-center text-sm font-bold">{item.quantity}</span>
                            <button type="button" aria-label={t("cart.increase")} onClick={() => updateQuantity(item.id, item.quantity + 1)} className="grid h-full w-8 place-items-center text-primary"><Plus className="size-3.5" /></button>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              {recommended.length > 0 && (
                <section className="rounded-xl border bg-card p-3">
                  <p className="mb-2 text-sm font-bold">{t("cart.addMore")}</p>
                  <div className="scrollbar-hide flex gap-2 overflow-x-auto">
                    {recommended.map((p) => (
                      <button key={p.id} type="button" onClick={() => go(`/product/${p.id}`)} className="w-24 shrink-0 text-start">
                        <div className="h-24 overflow-hidden rounded-lg bg-muted">{p.image_url ? <img src={img(p.image_url, 200)} alt={p.name} loading="lazy" className="size-full object-cover" /> : <Package className="m-auto mt-8 size-6 text-muted-foreground" />}</div>
                        <p className="mt-1 truncate text-[11px] font-medium">{p.name}</p>
                        <p className="text-xs font-bold">Rs {p.discount_price || p.price}</p>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <section className="space-y-2 rounded-xl border bg-card p-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">{t("cart.subtotal")} ({totalItems})</span><span className="font-semibold">Rs {totalPrice.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="flex items-center gap-1 text-muted-foreground"><Truck className="size-3.5" />{t("common.delivery")}</span><span className="text-xs text-muted-foreground">{t("cart.deliveryAtCheckout")}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t("cart.voucher")}</span><span className="text-xs text-muted-foreground">{t("cart.voucherAtCheckout")}</span></div>
              </section>
            </div>

            <div className="flex items-center gap-3 border-t bg-card px-4 py-3 shadow-elegant">
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">{t("cart.grandTotal")}</p>
                <p className="text-lg font-extrabold text-primary">Rs {totalPrice.toLocaleString()}</p>
              </div>
              <Button className="ms-auto h-11 flex-1 text-sm font-bold" onClick={() => go("/checkout")}>
                {t("cart.checkout")} <ChevronLeft className="size-4 ltr:rotate-180" />
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartDrawer;
