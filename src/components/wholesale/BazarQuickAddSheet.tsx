import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { tr } from "@/lib/i18n/tr";
import { displayText } from "@/lib/i18n/displayText";
import { availableShopQuantity } from "@/lib/shopOrders";
import type { BazarProduct } from "./BazarProductCard";

export type BazarVariant = { id?: string; label?: string; name?: string; size?: string; color?: string; price_delta?: number; stock_qty?: number | null; is_available?: boolean; image?: string };
type Product = BazarProduct & { variants?: unknown; stock_qty?: number | null; weight_kg?: number | null; weight?: string | null };

export const variantLabel = (v: BazarVariant) => v.label || v.name || [v.color, v.size].filter(Boolean).join(" / ");
export const variantPrice = (p: Pick<BazarProduct, "price" | "discount_price" | "wholesale_price">, v?: BazarVariant | null) =>
  Math.max(0, Number(p.wholesale_price ?? p.discount_price ?? p.price) + Number(v?.price_delta || 0));
/** Minimum is the vendor's MOQ; one piece is allowed when no MOQ is set. Stock caps the maximum. */
export const clampQty = (qty: number, moq: number | null | undefined, max: number | null) => {
  const min = Math.max(1, Number(moq) || 1);
  const capped = max == null ? qty : Math.min(qty, max);
  return Math.max(min, capped);
};

interface Props { product: Product | null; variants: BazarVariant[]; onClose: () => void; onAdd: (variant: BazarVariant, qty: number) => void; onOpenDetails: () => void }

const BazarQuickAddSheet = ({ product, variants, onClose, onAdd, onOpenDetails }: Props) => {
  const [index, setIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const moq = Math.max(1, Number(product?.min_order_qty) || 1);
  useEffect(() => { setIndex(0); setQty(moq); }, [product?.id, moq]);
  if (!product) return null;
  const selected = variants[index];
  const max = availableShopQuantity(product, selected);
  const soldOut = selected?.is_available === false || max === 0 || (max != null && max < moq);
  const price = variantPrice(product, selected);
  return <Sheet open onOpenChange={(o) => !o && onClose()}>
    <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
      <SheetHeader><SheetTitle dir="auto" className="text-start font-display text-base">{displayText(product.name)}</SheetTitle></SheetHeader>
      <p className="mt-1 text-xs text-muted-foreground" dir="auto">{product.storeName}</p>
      <p className="mt-3 text-sm font-bold">{tr("Choose option", "قسم منتخب کریں")}</p>
      <div className="mt-2 flex flex-wrap gap-2">{variants.map((v, i) => {
        const out = v.is_available === false || v.stock_qty === 0;
        return <Button key={v.id || i} type="button" size="sm" variant={i === index ? "default" : "outline"} disabled={out} onClick={() => setIndex(i)} className="h-9">
          {variantLabel(v) || tr(`Option ${i + 1}`, `قسم ${i + 1}`)}{Number(v.price_delta) ? <span className="ms-1 text-[10px] opacity-80" dir="ltr">{Number(v.price_delta) > 0 ? "+" : ""}{Number(v.price_delta)}</span> : null}
        </Button>;
      })}</div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div><p className="font-display text-xl font-extrabold text-primary">Rs {(price * qty).toLocaleString()}</p><p className="text-[11px] text-muted-foreground">Rs {price.toLocaleString()} × {qty}{moq > 1 ? ` · ${tr(`min ${moq} pcs`, `کم از کم ${moq} عدد`)}` : ""}</p></div>
        <div className="flex items-center gap-2">
          <Button type="button" size="icon" variant="outline" aria-label={tr("Decrease", "کم کریں")} disabled={qty <= moq} onClick={() => setQty((q) => clampQty(q - 1, moq, max))}><Minus className="size-4" /></Button>
          <span className="w-8 text-center font-bold" aria-live="polite">{qty}</span>
          <Button type="button" size="icon" variant="outline" aria-label={tr("Increase", "زیادہ کریں")} disabled={max != null && qty >= max} onClick={() => setQty((q) => clampQty(q + 1, moq, max))}><Plus className="size-4" /></Button>
        </div>
      </div>
      {soldOut && <p role="alert" className="mt-2 text-xs text-destructive">{tr("This option is not available in this quantity", "یہ قسم اس مقدار میں دستیاب نہیں")}</p>}
      <div className="mt-4 grid grid-cols-2 gap-2 pb-[env(safe-area-inset-bottom)]">
        <Button type="button" variant="outline" onClick={onOpenDetails}>{tr("Full details", "مکمل تفصیل")}</Button>
        <Button type="button" disabled={!selected || soldOut} onClick={() => onAdd(selected, qty)}>{tr("Add to cart", "ٹوکری میں ڈالیں")}</Button>
      </div>
    </SheetContent>
  </Sheet>;
};
export default BazarQuickAddSheet;
