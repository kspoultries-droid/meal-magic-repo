import { Package } from "lucide-react";

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
  storeName?: string;
}

interface Props {
  product: BazarProduct;
  onClick: () => void;
  compact?: boolean;
}

const BazarProductCard = ({ product, onClick, compact }: Props) => {
  const effective = product.wholesale_price ?? product.discount_price ?? product.price;
  const hasDiscount = effective < product.price;
  const off = hasDiscount ? Math.round(((product.price - effective) / product.price) * 100) : 0;

  return (
    <button
      onClick={onClick}
      className={`text-left bg-card rounded-2xl border overflow-hidden hover:shadow-md active:scale-[0.98] transition-all ${
        compact ? "shrink-0 w-32" : ""
      }`}
    >
      <div className="relative w-full aspect-square bg-secondary flex items-center justify-center overflow-hidden">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <Package className="w-7 h-7 text-muted-foreground" />
        )}
        {off > 0 && (
          <span className="absolute top-1.5 right-1.5 bg-destructive text-destructive-foreground text-[9px] font-extrabold px-1.5 py-0.5 rounded-md">
            -{off}%
          </span>
        )}
      </div>
      <div className="p-2">
        <p className="text-[11px] font-semibold text-foreground line-clamp-2 leading-tight min-h-[26px]">{product.name}</p>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-sm font-extrabold text-primary">Rs {effective}</span>
          {hasDiscount && <span className="text-[10px] text-muted-foreground line-through">Rs {product.price}</span>}
        </div>
        <div className="flex items-center justify-between mt-0.5">
          {product.storeName && (
            <span className="text-[9px] text-muted-foreground truncate max-w-[70%]">{product.storeName}</span>
          )}
          {product.min_order_qty && product.min_order_qty > 1 && (
            <span className="text-[9px] font-bold text-destructive">MOQ {product.min_order_qty}</span>
          )}
        </div>
      </div>
    </button>
  );
};

export default BazarProductCard;
