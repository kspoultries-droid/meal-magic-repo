import { Star, Clock, Tag, Plus } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import type { Restaurant } from "./RestaurantGrid";

interface RestaurantCardProps {
  restaurant: Restaurant;
}

const RestaurantCard = ({ restaurant }: RestaurantCardProps) => {
  const { name, image, rating, deliveryTime, cuisines, discount, menuItems, isActive } = restaurant;
  const [showMenu, setShowMenu] = useState(false);
  const { addItem } = useCart();

  return (
    <div className="group bg-card rounded-2xl overflow-hidden border shadow-sm hover:shadow-lg transition-all duration-300">
      {/* Image */}
      <div className="relative h-44 overflow-hidden" onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}>
        <img src={image} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        {discount && (
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
