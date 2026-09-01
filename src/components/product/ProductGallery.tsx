import { useState } from "react";
import { Package, Star } from "lucide-react";

interface Props {
  images: string[];
  name: string;
  rating?: number;
  soldCount?: number;
}

const ProductGallery = ({ images, name, rating = 0, soldCount = 0 }: Props) => {
  const [active, setActive] = useState(0);
  const list = images.filter(Boolean);

  return (
    <div className="relative bg-card">
      <div
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide aspect-square"
        onScroll={(e) => {
          const el = e.currentTarget;
          setActive(Math.round(el.scrollLeft / el.clientWidth));
        }}
      >
        {list.length === 0 ? (
          <div className="w-full shrink-0 flex items-center justify-center bg-secondary">
            <Package className="w-16 h-16 text-muted-foreground/40" />
          </div>
        ) : (
          list.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`${name} ${i + 1}`}
              loading={i === 0 ? "eager" : "lazy"}
              className="w-full h-full shrink-0 snap-center object-cover"
            />
          ))
        )}
      </div>

      {/* Overlay pills */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
        {list.length > 1 && (
          <span className="rounded-full bg-foreground/60 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-background">
            Item {active + 1}/{list.length}
          </span>
        )}
        <span className="ml-auto flex items-center gap-1.5 rounded-full bg-foreground/60 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-background">
          <Star className="w-3 h-3 fill-warning text-warning" />
          {rating > 0 ? rating.toFixed(1) : "New"}
          {soldCount > 0 && <span className="opacity-80">· {soldCount} فروخت</span>}
        </span>
      </div>

      {list.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {list.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === active ? "w-4 bg-primary" : "w-1.5 bg-background/70"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductGallery;
