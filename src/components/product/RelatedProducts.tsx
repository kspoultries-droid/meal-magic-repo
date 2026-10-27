import { img } from "@/lib/imageUrl";
import { useNavigate } from "react-router-dom";
import { Package } from "lucide-react";

export interface RelatedItem {
  id: string;
  name: string;
  price: number;
  discount_price: number | null;
  wholesale_price?: number | null;
  image_url: string | null;
}

const RelatedProducts = ({ items, title = "ملتی جلتی اشیاء" }: { items: RelatedItem[]; title?: string }) => {
  const navigate = useNavigate();
  if (items.length === 0) return null;

  return (
    <section className="px-4 pt-4">
      <h2 className="text-sm font-extrabold text-foreground mb-2.5">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {items.map((p) => {
          const eff = p.wholesale_price ?? p.discount_price ?? p.price;
          const off = eff < p.price ? Math.round(((p.price - eff) / p.price) * 100) : 0;
          return (
            <button
              key={p.id}
              onClick={() => navigate(`/product/${p.id}`)}
              className="text-left bg-card rounded-2xl border overflow-hidden active:scale-[0.98] transition-transform"
            >
              <div className="relative aspect-square bg-secondary flex items-center justify-center overflow-hidden">
                {p.image_url ? (
                  <img src={img(p.image_url, 300)} alt={p.name} loading="lazy" className="w-full h-full object-cover" />
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
                <p className="text-[11px] font-semibold text-foreground line-clamp-2 leading-tight min-h-[26px]">{p.name}</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-sm font-extrabold text-primary">Rs {eff}</span>
                  {off > 0 && <span className="text-[10px] text-muted-foreground line-through">Rs {p.price}</span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default RelatedProducts;
