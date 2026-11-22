import { img } from "@/lib/imageUrl";
import { tr } from "@/lib/i18n/tr";
import { displayText } from "@/lib/i18n/displayText";
import { useState } from "react";
import { Heart, ImageOff, Package, Plus, Star, Wrench, Cpu, PenTool, ShoppingBasket, Footprints, Shirt, Zap, Smartphone, type LucideIcon } from "lucide-react";

const CATEGORY_ICONS: [RegExp, LucideIcon][] = [[/hardware|sanitary|tool/i, Wrench], [/electronic/i, Cpu], [/electric/i, Zap], [/mobile/i, Smartphone], [/station|book/i, PenTool], [/kirana|grocery|general|department/i, ShoppingBasket], [/shoe/i, Footprints], [/fashion|cloth|garment/i, Shirt]];
const iconFor = (c?: string | null) => CATEGORY_ICONS.find(([r]) => r.test(c || ""))?.[1] || Package;
import { Button } from "@/components/ui/button";

export interface BazarProduct {
  id: string;
  store_id: string;
  name: string;
  price: number;
  discount_price: number | null;
  wholesale_price: number | null;
  image_url: string | null;
  images?: string[];
  unit: string | null;
  min_order_qty: number | null;
  rating?: number | null;
  category?: string | null;
  sold_count?: number | null;
  storeName?: string;
}

interface Props {
  product: BazarProduct;
  onClick: () => void;
  compact?: boolean;
  list?: boolean;
  isWishlisted?: boolean;
  onToggleWishlist?: () => void;
  onQuickAdd?: () => void;
}

const BazarProductCard = ({ product, onClick, compact, list = false, isWishlisted = false, onToggleWishlist, onQuickAdd }: Props) => {
  const [imageFailed, setImageFailed] = useState(false);
  const effective = product.wholesale_price ?? product.discount_price ?? product.price;
  const hasDiscount = effective < product.price;
  const off = hasDiscount ? Math.round(((product.price - effective) / product.price) * 100) : 0;
  const imageUrl = product.image_url || product.images?.[0] || null;
  const showImage = Boolean(imageUrl) && !imageFailed;

  return (
    <article className={`group relative h-full overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card ${compact ? "w-[10.5rem] shrink-0" : ""}`}>
      <Button variant="ghost" onClick={onClick} className={list ? "flex h-auto w-full items-center justify-start gap-3 whitespace-normal p-2 text-start hover:bg-card" : "block h-auto w-full whitespace-normal p-0 text-start hover:bg-card"} aria-label={tr(`View ${displayText(product.name)}`, `${product.name} دیکھیں`)}>
        <div className={`relative shrink-0 overflow-hidden bg-accent ${list ? "size-24 rounded-md" : compact ? "aspect-square w-full" : "aspect-square w-full"}`}>
          {showImage ? (
            <><img src={img(imageUrl as string, 400)} alt={product.name} loading="lazy" onError={() => setImageFailed(true)} className="relative h-full w-full object-contain p-1.5 bg-card transition-transform duration-500 group-hover:scale-105" /></>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-card via-secondary to-accent px-3 text-center text-accent-foreground">
              {(() => { const Icon = iconFor(product.category); return <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 shadow-soft"><Icon className="size-6 text-primary" /></span>; })()}
              <span dir="auto" className="line-clamp-2 text-[11px] font-bold leading-tight text-foreground">{displayText(product.name)}</span>
              <span className="rounded-full bg-card/80 px-2 py-0.5 text-[9px] font-semibold text-muted-foreground">{displayText(product.category) || tr("Bazar", "بازار")} · {tr("photo coming soon", "تصویر جلد")}</span>
              {imageUrl && <ImageOff className="absolute bottom-2 right-2 size-3.5 text-muted-foreground" />}
            </div>
          )}
          {off > 0 && <span className="absolute left-1.5 top-1.5 rounded-md bg-destructive px-1.5 py-1 text-[10px] font-bold text-destructive-foreground" dir="ltr">-{off}%</span>}
        </div>
        <div className={`min-w-0 space-y-1 ${list ? "flex-1 py-1" : "p-2"}`}>
          <p dir="auto" className={`line-clamp-2 text-xs font-semibold leading-tight text-card-foreground ${list ? "min-h-0" : "min-h-[2.25rem]"}`}>{displayText(product.name)}</p>
          <div className={list ? "" : "min-h-[2.5rem]"}>
            <p className="font-display text-base font-extrabold leading-none text-primary">Rs {effective.toLocaleString()}</p>
            <p className="mt-1 flex min-h-4 items-center gap-1 text-[10px]">{hasDiscount ? <><span className="text-muted-foreground line-through">Rs {product.price.toLocaleString()}</span><bdi dir="ltr" className="font-bold text-destructive">-{off}%</bdi></> : "\u00a0"}</p>
          </div>
          <div className="flex h-4 items-center gap-1 text-[10px] text-muted-foreground">
            {!!product.rating && <><Star className="size-3 fill-primary text-primary" /><span className="font-semibold text-foreground">{product.rating.toFixed(1)}</span></>}
            {!!product.rating && !!product.sold_count && <span className="text-border">|</span>}
            {!!product.sold_count && product.sold_count > 0 && <span>{product.sold_count.toLocaleString()} {tr("sold", "فروخت")}</span>}
          </div>
          <div className="flex h-5 min-w-0 items-center gap-1 pe-8">
            {product.wholesale_price != null && <span className="shrink-0 rounded bg-accent px-1 text-[9px] font-bold text-primary">{tr("Wholesale", "ہول سیل")}</span>}
            {product.min_order_qty && product.min_order_qty > 1 ? <span className="shrink-0 rounded border border-destructive/30 px-1 text-[9px] font-semibold text-destructive">{tr(`Min ${product.min_order_qty} pcs`, `کم از کم ${product.min_order_qty} عدد`)}</span> : null}
          </div>
          <p dir="auto" className="line-clamp-2 min-h-4 break-words ltr:pr-10 rtl:pl-10 text-start text-[10px] leading-tight text-muted-foreground">{product.storeName || displayText(product.unit) || tr("Shop now", "خریداری کریں")}</p>
        </div>
      </Button>
      {onToggleWishlist && <Button type="button" variant="secondary" size="icon" aria-label={isWishlisted ? tr("Remove from wishlist", "محفوظ فہرست سے ہٹائیں") : tr("Save", "محفوظ کریں")} onClick={onToggleWishlist} className="absolute right-1.5 top-1.5 size-7 rounded-full bg-card shadow-sm hover:bg-secondary">
        <Heart className={`size-3.5 ${isWishlisted ? "fill-destructive text-destructive" : "text-foreground"}`} />
      </Button>}
      {onQuickAdd && !list && <Button type="button" size="icon" aria-label={tr("Add to cart", "ٹوکری میں ڈالیں")} onClick={onQuickAdd} className={`absolute end-1.5 size-8 rounded-full bg-primary text-primary-foreground shadow-card bottom-2`}><Plus className="size-4" /></Button>}
    </article>
  );
};

export default BazarProductCard;
