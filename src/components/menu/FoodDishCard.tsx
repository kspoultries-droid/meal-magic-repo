import { Plus, UtensilsCrossed, Clock, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { img } from "@/lib/imageUrl";
import type { MenuItem, Restaurant } from "@/components/RestaurantGrid";

interface Props {
  item: MenuItem;
  restaurant: Restaurant;
  onSelect: () => void;
  onRestaurant: () => void;
}

export default function FoodDishCard({ item, restaurant, onSelect, onRestaurant }: Props) {
  const prices = (item.variants || []).map(v => Number(v.price)).filter(p => p > 0);
  const minPrice = prices.length ? Math.min(item.price > 0 ? item.price : Infinity, ...prices) : item.price;
  return (
    <article className="overflow-hidden rounded-lg border border-border bg-card shadow-soft">
      <Button variant="ghost" onClick={onSelect} disabled={!restaurant.isActive} className="block h-auto w-full rounded-none p-0 text-start whitespace-normal hover:bg-card">
        {item.image_url ? <img src={img(item.image_url, 480)} alt={item.name} loading="lazy" decoding="async" className="aspect-[16/10] w-full object-cover" /> : <div className="mx-4 mt-4 flex h-12 w-12 items-center justify-center rounded-lg bg-muted"><UtensilsCrossed className="h-5 w-5 text-muted-foreground" /></div>}
        <div className="px-4 pt-3">
          <h3 className="break-words text-base font-bold text-card-foreground">{item.name}</h3>
          {item.description && <p className="mt-1 line-clamp-2 text-xs font-normal text-muted-foreground">{item.description}</p>}
        </div>
      </Button>
      <div className="px-4 pb-4 pt-2">
        <Button variant="link" onClick={onRestaurant} className="h-auto max-w-full gap-1 p-0 text-xs font-semibold text-muted-foreground"><span className="truncate">{restaurant.name}</span><ArrowUpRight className="h-3 w-3 shrink-0" /></Button>
        <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground"><Clock className="h-3 w-3" />{restaurant.deliveryTime}{!restaurant.isActive && <span> · فی الحال بند</span>}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <p dir="ltr" className="font-extrabold text-primary">Rs {minPrice}{prices.length > 1 ? " سے" : ""}</p>
          <Button size="icon" onClick={onSelect} disabled={!restaurant.isActive} aria-label={`${item.name} منتخب کریں`} className="h-9 w-9 rounded-full"><Plus className="h-4 w-4" /></Button>
        </div>
      </div>
    </article>
  );
}