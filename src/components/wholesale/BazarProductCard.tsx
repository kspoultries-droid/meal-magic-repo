import { Heart, Package, Star } from "lucide-react";
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
  const effective = product.wholesale_price ?? product.discount_price ?? product.price;
  const hasDiscount = effective < product.price;
  const off = hasDiscount ? Math.round(((product.price - effective) / product.price) * 100) : 0;

  return (
    <article className={`group relative overflow-hidden rounded-xl border bg-card shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elegant ${compact ? "w-36 shrink-0" : ""}`}>
      <button onClick={onClick} className={list ? "flex w-full items-center gap-3 p-2 text-left" : "block w-full text-left"} aria-label={`${product.name} دیکھیں`}>
        <div className={`relative shrink-0 overflow-hidden bg-secondary ${list ? "size-24 rounded-lg" : "aspect-square w-full"}`}>
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : <Package className="absolute inset-0 m-auto size-8 text-muted-foreground" />}
          {off > 0 && <span className="absolute left-2 top-2 rounded-md bg-destructive px-1.5 py-1 text-[10px] font-bold text-destructive-foreground">-{off}%</span>}
          {onToggleWishlist && <Button type="button" variant="secondary" size="icon" aria-label={isWishlisted ? "محفوظ فہرست سے ہٹائیں" : "محفوظ کریں"} onClick={(event) => { event.stopPropagation(); onToggleWishlist(); }} className="absolute right-2 top-2 size-8 rounded-full bg-background/90 shadow-sm hover:bg-background">
            <Heart className={`size-4 ${isWishlisted ? "fill-destructive text-destructive" : "text-foreground"}`} />
          </Button>}
        </div>
        <div className={`min-w-0 space-y-1 ${list ? "flex-1 py-1" : "p-2.5"}`}>
          <p className={`line-clamp-2 text-xs font-semibold leading-tight text-card-foreground ${list ? "min-h-0" : "min-h-[2.25rem]"}`}>{product.name}</p>
          <div className="flex items-end justify-between gap-1">
             <div><p className="font-display text-base font-bold text-primary">Rs {effective.toLocaleString()}</p>{hasDiscount && <p className="text-[10px] text-muted-foreground line-through">Rs {product.price.toLocaleString()}</p>}</div>
             {product.rating && <span className="flex items-center gap-0.5 text-[10px] font-semibold text-muted-foreground"><Star className="size-3 fill-primary text-primary" />{product.rating.toFixed(1)}</span>}
           </div>
           <div className="flex items-center justify-between gap-1 text-[10px] text-muted-foreground">
             <span className="truncate">{product.storeName || product.unit || "خریداری کریں"}</span>
             {!!product.min_order_qty && product.min_order_qty > 1 && <span className="shrink-0 font-semibold text-destructive">MOQ {product.min_order_qty}</span>}
           </div>
           {!!product.sold_count && product.sold_count > 0 && <p className="text-[9px] font-semibold text-muted-foreground">{product.sold_count.toLocaleString()} فروخت</p>}
        </div>
      </button>
    </article>
  );
};

export default BazarProductCard;
