import { img } from "@/lib/imageUrl";
import { Star, Clock, Tag, Plus, Bike, Heart, ArrowUpRight } from "lucide-react";
import { foodStartingPrice } from "@/lib/foodPresentation";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import MenuItemSheet, { type MenuItemLike } from "@/components/menu/MenuItemSheet";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Restaurant } from "./RestaurantGrid";

interface RestaurantCardProps {
  restaurant: Restaurant;
  index?: number;
}

const optimizeImageUrl = (url: string): string => {
  if (!url) return url;
  if (url.includes("/storage/v1/object/public/")) return img(url, 480);
  if (url.includes("images.unsplash.com")) {
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
  const { id: restaurantId, name, image, rating, deliveryTime, cuisines, discount, menuItems, isActive, minPrice, paysDeliveryFee } = restaurant;
  const [fav, setFav] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [sheetItem, setSheetItem] = useState<MenuItemLike | null>(null);
  const { addItem } = useCart();
  const { lang } = useLanguage();
  const L = (en: string, ur: string) => (lang === "ur" ? ur : en);
  const navigate = useNavigate();
  const optimizedImage = optimizeImageUrl(image);
  const isAboveFold = index < 4;


  return (
    <div
      className={`food-restaurant-card group relative h-full bg-card rounded-lg overflow-hidden border border-border/60 shadow-soft ${
        !isActive ? "grayscale-[0.6]" : ""
      }`}
    >
      {/* Image */}
      <Button variant="ghost" type="button"
        aria-label={L(`View ${name} menu`, `${name} کا مینو دیکھیں`)}
        className="relative block h-auto aspect-[16/10] w-full p-0 rounded-none overflow-hidden"
        onClick={() => navigate(`/restaurant/${restaurantId}`)}
      >
        <img
          src={optimizedImage}
          alt={name}
          width={400}
          height={300}
          loading={isAboveFold ? "eager" : "lazy"}
          decoding="async"
          {...(isAboveFold ? { fetchpriority: "high" } : {})}
          className="w-full h-full object-cover"
        />

        {!isActive && (
          <div className="absolute inset-0 bg-foreground/15 flex items-center justify-center">
            <span className="bg-destructive text-destructive-foreground text-xs font-bold px-4 py-2 rounded-full shadow-card">
              {L("Closed", "بند ہے")}
            </span>
          </div>
        )}

        {discount && isActive && (
          <div className="absolute top-3 left-3 bg-gradient-primary text-primary-foreground text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1 shadow-glow animate-scale-in">
            <Tag className="w-3 h-3" />
            {discount}
          </div>
        )}

      </Button>
        {/* Favourite is separate from the menu link to avoid nested buttons. */}
        <Button variant="ghost"
          onClick={(e) => { e.stopPropagation(); setFav((v) => !v); }}
          aria-label={L("Favourite", "پسندیدہ")}
          aria-pressed={fav}
          className="absolute top-3 right-3 p-0 w-9 h-9 rounded-full bg-card/85  flex items-center justify-center shadow-soft active:scale-90 transition-transform"
        >
          <Heart className={`w-4 h-4 ${fav ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
        </Button>

      {/* Info */}
      <div className="p-4">
        <h3 className="mb-1.5">
          <Button variant="link" onClick={() => navigate(`/restaurant/${restaurantId}`)} className="h-auto max-w-full p-0 text-start whitespace-normal text-base font-extrabold text-foreground">
            {name}<ArrowUpRight className="ms-1 size-4 shrink-0 text-muted-foreground rtl:-rotate-90" />
          </Button>
        </h3>
        <p className="text-muted-foreground text-xs truncate mb-3">{cuisines.join(" · ")}</p>
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1 font-semibold text-foreground">{rating > 0 && <Star className="size-3.5 fill-current text-warning" />}{rating > 0 ? rating : L("New", "نیا")}</span>
          <span className="flex items-center gap-1"><Clock className="size-3.5" />{deliveryTime}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-[10px] font-bold text-accent-foreground bg-accent rounded-full px-2.5 py-1">
            <Bike className="w-3 h-3" /> {paysDeliveryFee ? L("Free delivery", "فری ڈیلیوری") : L("Delivery", "ڈیلیوری")}
          </span>
          {minPrice != null && (
            <span className="text-[10px] font-bold text-foreground bg-secondary rounded-full px-2.5 py-1">
              {L(`From Rs. ${minPrice}`, `Rs. ${minPrice} سے`)}
            </span>
          )}
          {menuItems.length > 0 && isActive && (
            <Button variant="ghost"
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowMenu((v) => !v); }}
              aria-expanded={showMenu}
              className="h-9 text-xs font-semibold text-primary ms-auto rounded-lg border border-primary/30 px-2.5 py-1"
            >
              {showMenu ? L("Close", "بند کریں") : L("Quick order", "فوری آرڈر")}
            </Button>
          )}
        </div>
      </div>

      {/* Quick Menu */}
      {showMenu && menuItems.length > 0 && (
        <div className="border-t border-border/60 px-4 py-3 space-y-2 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
          <p className="text-[10px] font-bold text-muted-foreground uppercase">{L("Quick add", "فوری شامل کریں")}</p>
          {menuItems.map((item) => {
            const hasChoices = (item.variants?.length || 0) > 0 || (item.option_groups?.length || 0) > 0;
            const minPrice = foodStartingPrice([item]);
            return (
              <div key={item.id} className="flex items-center justify-between py-1.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                  <p className="text-xs text-primary font-bold">
                    {item.variants?.length ? L(`From Rs. ${minPrice}`, `Rs. ${minPrice} سے`) : `Rs. ${item.price}`}
                  </p>
                </div>
                <Button variant="ghost"
                  aria-label={L(`Add ${item.name}`, `${item.name} شامل کریں`)}
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
                  className="p-0 w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-glow active:scale-90 transition-transform shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
          <Button variant="ghost"
            type="button"
            onClick={(e) => { e.stopPropagation(); navigate(`/restaurant/${restaurantId}`); }}
            className="h-10 w-full mt-1 rounded-lg bg-secondary py-2 text-xs font-bold text-primary active:scale-95 transition-transform"
          >
            {L("View full menu →", "پورا مینو دیکھیں →")}
          </Button>
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
