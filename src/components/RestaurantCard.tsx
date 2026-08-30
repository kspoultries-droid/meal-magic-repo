import { Star, Clock, Tag, Plus, Bike } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import MenuItemSheet, { type MenuItemLike } from "@/components/menu/MenuItemSheet";
import type { Restaurant } from "./RestaurantGrid";

interface RestaurantCardProps {
  restaurant: Restaurant;
  index?: number;
}

const optimizeImageUrl = (url: string): string => {
  if (!url) return url;
  if (url.includes('images.unsplash.com')) {
    const u = new URL(url);
    u.searchParams.set('w', '400');
    u.searchParams.set('h', '300');
    u.searchParams.set('fit', 'crop');
    u.searchParams.set('fm', 'webp');
    u.searchParams.set('q', '75');
    return u.toString();
  }
  return url;
};

const RestaurantCard = ({ restaurant, index = 99 }: RestaurantCardProps) => {
  const { id: restaurantId, name, image, rating, deliveryTime, cuisines, discount, menuItems, isActive } = restaurant;
  const [showMenu, setShowMenu] = useState(false);
  const [sheetItem, setSheetItem] = useState<MenuItemLike | null>(null);
  const { addItem } = useCart();
  const optimizedImage = optimizeImageUrl(image);
  const isAboveFold = index < 4;


  return (
    <div
      className={`group relative bg-gradient-card rounded-3xl overflow-hidden border border-border/60 shadow-card hover:shadow-elegant hover:-translate-y-1 transition-all duration-300 ${
        !isActive ? "opacity-60 grayscale" : ""
      }`}
    >
      {/* Image */}
      <div
        className="relative h-44 overflow-hidden"
        onClick={(e) => {
          e.stopPropagation();
          if (isActive) setShowMenu(!showMenu);
        }}
      >
        <img
          src={optimizedImage}
          alt={name}
          width={400}
          height={300}
          loading={isAboveFold ? "eager" : "lazy"}
          {...(isAboveFold ? { fetchpriority: "high" } : {})}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent" />

        {!isActive && (
          <div className="absolute inset-0 bg-foreground/50 backdrop-blur-[2px] flex items-center justify-center">
            <span className="bg-destructive text-destructive-foreground text-xs font-bold px-4 py-2 rounded-full shadow-card">
              بند ہے / Closed
            </span>
          </div>
        )}

        {discount && isActive && (
          <div className="absolute top-3 left-3 bg-gradient-primary text-primary-foreground text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1 shadow-glow animate-scale-in">
            <Tag className="w-3 h-3" />
            {discount}
          </div>
        )}

        {/* Rating pill on image */}
        <span className="absolute bottom-2.5 left-3 flex items-center gap-1 text-[11px] font-bold text-primary-foreground bg-foreground/50 backdrop-blur-md rounded-full px-2.5 py-1">
          <Star className="w-3 h-3 fill-current text-warning" />
          {rating || "New"}
        </span>
        <span className="absolute bottom-2.5 right-3 flex items-center gap-1 text-[11px] font-semibold text-primary-foreground bg-foreground/50 backdrop-blur-md rounded-full px-2.5 py-1">
          <Clock className="w-3 h-3" />
          {deliveryTime}
        </span>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-extrabold text-foreground text-base mb-1.5 truncate group-hover:text-primary transition-colors">
          {name}
        </h3>
        <p className="text-muted-foreground text-xs truncate mb-3">{cuisines.join(" · ")}</p>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[10px] font-bold text-accent-foreground bg-accent rounded-full px-2.5 py-1">
            <Bike className="w-3 h-3" /> فوری ڈیلیوری
          </span>
          {menuItems.length > 0 && isActive && (
            <span className="text-[10px] font-semibold text-primary ml-auto">
              {showMenu ? "بند کریں" : "مینو دیکھیں"}
            </span>
          )}
        </div>
      </div>

      {/* Quick Menu */}
      {showMenu && menuItems.length > 0 && (
        <div className="border-t border-border/60 px-4 py-3 space-y-2 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">فوری شامل کریں</p>
          {menuItems.map((item) => {
            const hasChoices = (item.variants?.length || 0) > 0 || (item.option_groups?.length || 0) > 0;
            const minPrice = item.variants?.length
              ? Math.min(...item.variants.map((v: any) => Number(v.price) || 0))
              : item.price;
            return (
              <div key={item.id} className="flex items-center justify-between py-1.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                  <p className="text-xs text-primary font-bold">
                    {hasChoices && item.variants?.length ? `Rs. ${minPrice} سے` : `Rs. ${item.price}`}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hasChoices) {
                      setSheetItem({
                        id: item.id, name: item.name, price: item.price,
                        description: item.description, image_url: item.image_url,
                        variants: item.variants as any, option_groups: item.option_groups as any,
                      });
                      return;
                    }
                    addItem({
                      id: item.id, menu_item_id: item.id, name: item.name, restaurant: name,
                      price: item.price, image: item.image_url || image,
                      source: "restaurant", sourceId: restaurantId,
                    });
                  }}
                  className="w-8 h-8 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-glow active:scale-90 transition-transform shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div onClick={(e) => e.stopPropagation()}>
        <MenuItemSheet
          item={sheetItem}
          restaurant={{ id: restaurantId, name, image_url: image }}
          onClose={() => setSheetItem(null)}
        />
      </div>
    </div>
  );
};

export default RestaurantCard;
