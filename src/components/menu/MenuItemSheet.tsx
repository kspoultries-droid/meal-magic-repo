import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";
import { useCart, type AddItemInput, type CartItemOption } from "@/contexts/CartContext";
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
  if (raw.some((v) => v.id === "base" || v.id === "__base")) return raw;
  if (!item.price || item.price <= 0) return raw;
  return [{ id: "__base", label: "بنیادی", price: Number(item.price) }, ...raw];
};

const MenuItemSheet = ({ item, restaurant, onClose }: Props) => {
  const { addItems } = useCart();
  const variants = withBaseVariant(item);
  const groups = (item?.option_groups || []) as MenuOptionGroup[];

  const [variantQty, setVariantQty] = useState<Record<string, number>>({});
  const [choiceQty, setChoiceQty] = useState<Record<string, number>>({});
  const [baseQty, setBaseQty] = useState(1);

  // Reset when item changes
  useEffect(() => {
    if (item) {
      const availableVariants = withBaseVariant(item);
      setVariantQty(availableVariants.length > 0 && availableVariants[0] ? { [availableVariants[0].id]: 1 } : {});
      setChoiceQty({});
      setBaseQty(1);
    }
  }, [item?.id]);

  const total = useMemo(() => {
    if (!item) return 0;
    const mains = variants.length > 0
      ? variants.reduce((sum, variant) => sum + Number(variant.price) * (variantQty[variant.id] || 0), 0)
      : Number(item.price) * baseQty;
    const extras = groups.reduce((sum, group) => sum + group.choices.reduce((groupSum, choice) => groupSum + Number(choice.price_delta || 0) * (choiceQty[choice.id] || 0), 0), 0);
    return mains + extras;
  }, [baseQty, choiceQty, groups, item?.price, variantQty, variants]);

  if (!item || !restaurant) return null;

  const changeQty = (setter: React.Dispatch<React.SetStateAction<Record<string, number>>>, id: string, delta: number) => {
    setter((previous) => ({ ...previous, [id]: Math.max(0, (previous[id] || 0) + delta) }));
  };

  // For "pick one" (max=1) groups, tapping + on a new choice switches to it
  // instead of being dead — like a radio button with a stepper.
  const bumpChoice = (group: MenuOptionGroup, choiceId: string, delta: number) => {
    setChoiceQty((previous) => {
      const next = { ...previous };
      if (delta > 0 && group.max === 1 && !next[choiceId]) {
        group.choices.forEach((c) => { next[c.id] = 0; });
      }
      next[choiceId] = Math.max(0, (next[choiceId] || 0) + delta);
      return next;
    });
  };

  const handleAdd = () => {
    const selectedMainQty = variants.length > 0
      ? Object.values(variantQty).reduce((sum, value) => sum + value, 0)
      : baseQty;
    if (selectedMainQty < 1) { toast.error("کم از کم ایک سائز منتخب کریں"); return; }

    for (const g of groups) {
      const count = g.choices.reduce((sum, choice) => sum + (choiceQty[choice.id] || 0), 0);
      if (count < g.min) { toast.error(`"${g.name}" میں کم از کم ${g.min} منتخب کریں`); return; }
      if (count > g.max) { toast.error(`"${g.name}" میں زیادہ سے زیادہ ${g.max} چن سکتے ہیں`); return; }
    }

    const common = { menu_item_id: item.id, restaurant: restaurant.name, image: item.image_url || restaurant.image_url || "", source: "restaurant" as const, sourceId: restaurant.id };
    const lines: AddItemInput[] = [];
    if (variants.length > 0) {
      variants.forEach((variant) => {
        const quantity = variantQty[variant.id] || 0;
        if (quantity < 1) return;
        const isSyntheticBase = variant.id === "__base";
        lines.push({ ...common, name: `${item.name} — ${variant.label}`, price: Number(variant.price), variant_id: isSyntheticBase ? null : variant.id, variant_label: variant.label, line_type: "main", quantity });
      });
    } else {
      lines.push({ ...common, name: item.name, price: Number(item.price), line_type: "main", quantity: baseQty });
    }
    groups.forEach((group) => group.choices.forEach((choice) => {
      const quantity = choiceQty[choice.id] || 0;
      if (quantity < 1) return;
      const option: CartItemOption = { group_id: group.id, group: group.name, choice_id: choice.id, choice: choice.label, price_delta: Number(choice.price_delta || 0) };
      lines.push({ ...common, name: choice.label, price: Number(choice.price_delta || 0), line_type: "addon", choice_id: choice.id, options: [option], quantity });
    }));
    addItems(lines);
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
                {variants.map((v) => {
                  const quantity = variantQty[v.id] || 0;
                  return <div key={v.id} className={`flex items-center justify-between gap-3 p-3 border-2 rounded-xl transition-all ${quantity > 0 ? "border-primary bg-primary/5" : "border-border"}`}>
                    <div><span className="text-sm font-semibold">{v.label}</span><p className="text-xs font-extrabold text-primary">Rs {v.price}</p></div>
                    <div className="flex items-center gap-1 rounded-full border bg-background p-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => changeQty(setVariantQty, v.id, -1)}><Minus className="h-3.5 w-3.5" /></Button>
                      <span className="w-5 text-center text-sm font-extrabold">{quantity}</span>
                      <Button size="icon" className="h-7 w-7 rounded-full" onClick={() => changeQty(setVariantQty, v.id, 1)}><Plus className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>;
                })}
              </div>
            </section>
          )}

          {variants.length === 0 && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold">تعداد</h3>
                <span className="text-xs font-extrabold text-primary">Rs {Number(item.price)} فی پلیٹ</span>
              </div>
              <div className="flex items-center justify-between gap-3 p-3 border-2 rounded-xl border-primary bg-primary/5">
                <div><span className="text-sm font-semibold">{item.name}</span></div>
                <div className="flex items-center gap-1 rounded-full border bg-background p-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => setBaseQty((q) => Math.max(0, q - 1))}><Minus className="h-3.5 w-3.5" /></Button>
                  <span className="w-5 text-center text-sm font-extrabold">{baseQty}</span>
                  <Button size="icon" className="h-7 w-7 rounded-full" onClick={() => setBaseQty((q) => q + 1)}><Plus className="h-3.5 w-3.5" /></Button>
                </div>
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
                  const quantity = choiceQty[c.id] || 0;
                  return (
                    <div key={c.id} className={`flex items-center justify-between gap-3 p-3 border-2 rounded-xl transition-all ${quantity > 0 ? "border-primary bg-primary/5" : "border-border"}`}>
                      <div>
                        <span className="text-sm font-semibold">{c.label}</span>
                        <p className="text-xs font-bold text-primary">Rs {c.price_delta}</p>
                      </div>
                      <div className="flex items-center gap-1 rounded-full border bg-background p-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => bumpChoice(g, c.id, -1)}><Minus className="h-3.5 w-3.5" /></Button>
                        <span className="w-5 text-center text-sm font-extrabold">{quantity}</span>
                        <Button size="icon" className="h-7 w-7 rounded-full" disabled={g.max > 1 && g.choices.reduce((sum, choice) => sum + (choiceQty[choice.id] || 0), 0) >= g.max} onClick={() => bumpChoice(g, c.id, 1)}><Plus className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="border-t bg-background/95 backdrop-blur px-5 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)] flex items-center gap-3">
          <Button className="flex-1 h-12 font-extrabold bg-gradient-primary shadow-glow" onClick={handleAdd}>
            منتخب اشیاء شامل کریں — Rs {total}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MenuItemSheet;
