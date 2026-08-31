import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";
import { useCart, type CartItemOption } from "@/contexts/CartContext";
import { toast } from "sonner";

export interface MenuVariant {
  id: string;
  label: string;
  price: number;
}

export interface MenuChoice {
  id: string;
  label: string;
  price_delta: number;
}

export interface MenuOptionGroup {
  id: string;
  name: string;
  min: number;
  max: number;
  choices: MenuChoice[];
}

export interface MenuItemLike {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  image_url?: string | null;
  variants?: MenuVariant[] | null;
  option_groups?: MenuOptionGroup[] | null;
}

interface Props {
  item: MenuItemLike | null;
  restaurant: { id: string; name: string; image_url?: string | null } | null;
  onClose: () => void;
}

// Always show the item's own (base) price as the first choice, so the main
// item never disappears behind its variants.
export const withBaseVariant = (item: MenuItemLike | null): MenuVariant[] => {
  const raw = ((item?.variants || []) as MenuVariant[]).filter((v) => v && v.label);
  if (!item || raw.length === 0) return [];
  if (raw.some((v) => v.id === "base")) return raw;
  if (!item.price || item.price <= 0) return raw;
  return [{ id: "base", label: "بنیادی", price: Number(item.price) }, ...raw];
};

const MenuItemSheet = ({ item, restaurant, onClose }: Props) => {
  const { addItem } = useCart();
  const variants = withBaseVariant(item);
  const groups = (item?.option_groups || []) as MenuOptionGroup[];

  const [variantId, setVariantId] = useState<string>(variants[0]?.id || "");
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [qty, setQty] = useState(1);

  // Reset when item changes
  useMemo(() => {
    if (item) {
      setVariantId(withBaseVariant(item)[0]?.id || "");
      const init: Record<string, string[]> = {};
      ((item.option_groups as MenuOptionGroup[]) || []).forEach((g) => {
        // Auto-select first choice only for strictly required single-choice groups
        if (g.min >= 1 && g.max === 1 && g.choices[0]) init[g.id] = [g.choices[0].id];
        else init[g.id] = [];
      });
      setSelected(init);
      setQty(1);
    }
  }, [item?.id]);

  if (!item || !restaurant) return null;

  const variant = variants.find((v) => v.id === variantId);
  const basePrice = variant ? variant.price : item.price;

  let optionsDelta = 0;
  const selectedOptions: CartItemOption[] = [];
  const selectedIds: string[] = [];
  groups.forEach((g) => {
    (selected[g.id] || []).forEach((cid) => {
      const c = g.choices.find((x) => x.id === cid);
      if (!c) return;
      optionsDelta += Number(c.price_delta || 0);
      selectedIds.push(cid);
      selectedOptions.push({
        group_id: g.id, group: g.name,
        choice_id: c.id, choice: c.label,
        price_delta: Number(c.price_delta || 0),
      });
    });
  });

  const unitPrice = Math.max(0, basePrice + optionsDelta);
  const total = unitPrice * qty;

  const toggleChoice = (g: MenuOptionGroup, cid: string) => {
    setSelected((prev) => {
      const cur = prev[g.id] || [];
      const has = cur.includes(cid);
      let next: string[];
      if (g.max === 1) {
        next = has && g.min === 0 ? [] : [cid];
      } else {
        next = has ? cur.filter((x) => x !== cid) : [...cur, cid];
        if (next.length > g.max) return prev;
      }
      return { ...prev, [g.id]: next };
    });
  };

  const handleAdd = () => {
    // Validate group min/max
    for (const g of groups) {
      const count = (selected[g.id] || []).length;
      if (count < g.min) { toast.error(`"${g.name}" میں کم از کم ${g.min} منتخب کریں`); return; }
      if (count > g.max) { toast.error(`"${g.name}" میں زیادہ سے زیادہ ${g.max} چن سکتے ہیں`); return; }
    }
    if (variants.length > 0 && !variantId) { toast.error("سائز منتخب کریں"); return; }

    const showVariant = variant && variant.id !== "base";
    addItem({
      menu_item_id: item.id,
      name: item.name + (showVariant ? ` — ${variant!.label}` : ""),
      restaurant: restaurant.name,
      price: unitPrice,
      image: item.image_url || restaurant.image_url || "",
      source: "restaurant",
      sourceId: restaurant.id,
      variant_id: variant?.id || null,
      variant_label: showVariant ? variant!.label : null,
      option_ids: selectedIds,
      options: selectedOptions,
      quantity: qty,
    });
    onClose();
  };

  return (
    <Sheet open={!!item} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="h-[85vh] p-0 rounded-t-3xl flex flex-col">
        <SheetHeader className="p-0">
          {item.image_url && (
            <img src={item.image_url} alt={item.name} className="w-full h-40 object-cover rounded-t-3xl" />
          )}
          <div className="px-5 pt-3">
            <SheetTitle className="text-left text-lg font-extrabold">{item.name}</SheetTitle>
            {item.description && <p className="text-xs text-muted-foreground text-right mt-1">{item.description}</p>}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {variants.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold">سائز / وزن</h3>
                <span className="text-[10px] font-bold text-primary">لازمی</span>
              </div>
              <div className="space-y-2">
                {variants.map((v) => (
                  <label key={v.id} className={`flex items-center justify-between gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${variantId === v.id ? "border-primary bg-primary/5" : "border-border"}`}>
                    <div className="flex items-center gap-2">
                      <input type="radio" name="variant" checked={variantId === v.id} onChange={() => setVariantId(v.id)} className="accent-primary" />
                      <span className="text-sm font-semibold">{v.label}</span>
                    </div>
                    <span className="text-sm font-extrabold text-primary">Rs {v.price}</span>
                  </label>
                ))}
              </div>
            </section>
          )}

          {groups.map((g) => (
            <section key={g.id}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold">{g.name}</h3>
                <span className="text-[10px] font-bold text-muted-foreground">
                  {g.min > 0 ? `لازمی • ${g.min === g.max ? g.min : `${g.min}-${g.max}`}` : g.max === 1 ? "اختیاری" : `زیادہ سے زیادہ ${g.max}`}
                </span>
              </div>
              <div className="space-y-2">
                {g.choices.map((c) => {
                  const isSel = (selected[g.id] || []).includes(c.id);
                  const single = g.max === 1;
                  return (
                    <label key={c.id} className={`flex items-center justify-between gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${isSel ? "border-primary bg-primary/5" : "border-border"}`}>
                      <div className="flex items-center gap-2">
                        <input type={single ? "radio" : "checkbox"} name={`grp-${g.id}`} checked={isSel} onChange={() => toggleChoice(g, c.id)} className="accent-primary" />
                        <span className="text-sm font-semibold">{c.label}</span>
                      </div>
                      {Number(c.price_delta) !== 0 && (
                        <span className={`text-xs font-bold ${c.price_delta > 0 ? "text-foreground" : "text-success"}`}>
                          {c.price_delta > 0 ? "+" : ""}Rs {c.price_delta}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="border-t bg-background/95 backdrop-blur px-5 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)] flex items-center gap-3">
          <div className="flex items-center gap-1 bg-secondary rounded-full p-1">
            <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-8 h-8 rounded-full bg-background flex items-center justify-center">
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-6 text-center font-extrabold">{qty}</span>
            <button onClick={() => setQty(qty + 1)} className="w-8 h-8 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <Button className="flex-1 h-12 font-extrabold bg-gradient-primary shadow-glow" onClick={handleAdd}>
            کارٹ میں شامل — Rs {total}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MenuItemSheet;
