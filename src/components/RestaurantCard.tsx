import { Star, Clock, Tag, Plus } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
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

const RestaurantCard = ({ restaurant }: RestaurantCardProps) => {
  const { name, image, rating, deliveryTime, cuisines, discount, menuItems, isActive } = restaurant;
  const [showMenu, setShowMenu] = useState(false);
  const { addItem } = useCart();
  const optimizedImage = optimizeImageUrl(image);

  return (
    <div className={`group bg-card rounded-2xl overflow-hidden border shadow-sm hover:shadow-lg transition-all duration-300 ${!isActive ? 'opacity-60 grayscale' : ''}`}>
      {/* Image */}
      <div className="relative h-44 overflow-hidden" onClick={(e) => { e.stopPropagation(); if (isActive) setShowMenu(!showMenu); }}>
        <img src={optimizedImage} alt={name} width={400} height={300} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        {!isActive && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-destructive text-destructive-foreground text-sm font-bold px-4 py-2 rounded-lg">بند ہے / Closed</span>
          </div>
        )}
        {discount && isActive && (
          <div className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
            <Tag className="w-3 h-3" />
            {discount}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-bold text-foreground text-base mb-2 group-hover:text-primary transition-colors">{name}</h3>
        <div className="flex items-center gap-3 mb-2">
          <span className="flex items-center gap-1 bg-success/10 text-success text-xs font-bold px-2 py-1 rounded-md">
            <Star className="w-3 h-3 fill-current" />
            {rating || "New"}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground text-xs">
            <Clock className="w-3 h-3" />
            {deliveryTime}
          </span>
        </div>
        <p className="text-muted-foreground text-xs truncate">{cuisines.join(" · ")}</p>
      </div>

      {/* Quick Menu */}
      {showMenu && menuItems.length > 0 && (
        <div className="border-t px-4 py-3 space-y-2 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">فوری شامل کریں</p>
          {menuItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-1.5">
              <div>
                <p className="text-sm font-semibold text-foreground">{item.name}</p>
                <p className="text-xs text-primary font-bold">Rs. {item.price}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  addItem({ id: item.id, name: item.name, restaurant: name, price: item.price, image });
                }}
                className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RestaurantCard;
