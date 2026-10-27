import { img } from "@/lib/imageUrl";
import { useState } from "react";
import { Heart, ImageOff, Package, Star } from "lucide-react";
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
}

const BazarProductCard = ({ product, onClick, compact, list = false, isWishlisted = false, onToggleWishlist }: Props) => {
  const [imageFailed, setImageFailed] = useState(false);
  const effective = product.wholesale_price ?? product.discount_price ?? product.price;
  const hasDiscount = effective < product.price;
  const off = hasDiscount ? Math.round(((product.price - effective) / product.price) * 100) : 0;
  const imageUrl = product.image_url || product.images?.[0] || null;
  const showImage = Boolean(imageUrl) && !imageFailed;

  return (
    <article className={`group relative h-full overflow-hidden rounded-lg border border-border bg-card shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card ${compact ? "w-[7.5rem] shrink-0" : ""}`}>
      <Button variant="ghost" onClick={onClick} className={list ? "flex h-auto w-full items-center justify-start gap-3 whitespace-normal p-2 text-start hover:bg-card" : "block h-auto w-full whitespace-normal p-0 text-start hover:bg-card"} aria-label={`${product.name} دیکھیں`}>
        <div className={`relative shrink-0 overflow-hidden bg-accent ${list ? "size-24 rounded-md" : compact ? "h-28 w-full" : "aspect-square w-full"}`}>
          {showImage ? (
            <img src={img(imageUrl as string, 400)} alt={product.name} loading="lazy" onError={() => setImageFailed(true)} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-accent-foreground">
              <span className="grid size-10 place-items-center rounded-full border border-primary/20 bg-card/70"><Package className="size-5 text-primary" /></span>
              <span className="max-w-[90%] truncate text-[9px] font-semibold">{product.category || "بازار"}</span>
              {imageUrl && <ImageOff className="absolute bottom-2 right-2 size-3.5 text-muted-foreground" />}
            </div>
          )}
          {off > 0 && <span className="absolute left-1.5 top-1.5 rounded-md bg-destructive px-1.5 py-1 text-[10px] font-bold text-destructive-foreground">-{off}%</span>}
        </div>
        <div className={`min-w-0 space-y-1 ${list ? "flex-1 py-1" : "p-2"}`}>
          <p className={`line-clamp-2 text-xs font-semibold leading-tight text-card-foreground ${list ? "min-h-0" : "min-h-[2.25rem]"}`}>{product.name}</p>
          <div className={`flex flex-wrap items-end justify-between gap-1 ${list ? "" : "min-h-[2.75rem]"}`}>
            <div><p className="font-display text-sm font-bold text-primary">Rs {effective.toLocaleString()}</p><p className="min-h-4 text-[9px] text-muted-foreground line-through">{hasDiscount ? `Rs ${product.price.toLocaleString()}` : "\u00a0"}</p></div>
            {product.rating && <span className="flex items-center gap-0.5 text-[9px] font-semibold text-muted-foreground"><Star className="size-2.5 fill-primary text-primary" />{product.rating.toFixed(1)}</span>}
          </div>
          <div className="min-w-0 text-[9px] text-muted-foreground">
            <p className="h-4 truncate">{product.storeName || product.unit || "خریداری کریں"}</p>
            <p className="h-4 truncate font-semibold text-destructive">{product.min_order_qty && product.min_order_qty > 1 ? `MOQ ${product.min_order_qty}` : "\u00a0"}</p>
          </div>
          <p className="h-4 truncate text-[9px] font-semibold text-muted-foreground">{product.sold_count && product.sold_count > 0 ? `${product.sold_count.toLocaleString()} فروخت` : "\u00a0"}</p>
        </div>
      </Button>
      {onToggleWishlist && <Button type="button" variant="secondary" size="icon" aria-label={isWishlisted ? "محفوظ فہرست سے ہٹائیں" : "محفوظ کریں"} onClick={onToggleWishlist} className="absolute right-1.5 top-1.5 size-7 rounded-full bg-card shadow-sm hover:bg-secondary">
        <Heart className={`size-3.5 ${isWishlisted ? "fill-destructive text-destructive" : "text-foreground"}`} />
      </Button>}
    </article>
  );
};

export default BazarProductCard;
