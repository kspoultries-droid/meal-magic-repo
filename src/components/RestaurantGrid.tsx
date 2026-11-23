import CategoryEmptyState from "@/components/food/CategoryEmptyState";
import { useQuery } from "@tanstack/react-query";
import { matchesFoodCategory } from "@/lib/foodCategoryMatch";
import restaurantFallback from "@/assets/hero-food.jpg";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import RestaurantCard from "./RestaurantCard";
import { RestaurantGridSkeleton } from "./ui/skeleton-card";
import type { QuickFilter } from "./QuickCategories";
import { Button } from "./ui/button";
import FoodDishCard from "./menu/FoodDishCard";
import MenuItemSheet from "./menu/MenuItemSheet";
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { foodStartingPrice } from "@/lib/foodPresentation";
import { matchesSearch } from "@/lib/searchMatch";

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  description?: string | null;
  image_url?: string | null;
  category?: string | null;
  variants?: any[] | null;
  option_groups?: any[] | null;
}

export interface Restaurant {
  id: string;
  name: string;
  image: string;
  rating: number;
  deliveryTime: string;
  cuisines: string[];
  discount?: string;
  menuItems: MenuItem[];
  matchingItems?: MenuItem[];
  isActive: boolean;
  createdAt?: string | null;
  pickupAddress?: string | null;
  deliveryMode?: string | null;
  minPrice?: number | null;
  paysDeliveryFee?: boolean;
}

interface RestaurantGridProps {
  searchQuery: string;
  activeCategory: string;
  quickFilter?: QuickFilter;
  onClearQuickFilter?: () => void;
  dishesOnly?: boolean;
}

const RestaurantGrid = ({ searchQuery, activeCategory, quickFilter = null, onClearQuickFilter, dishesOnly = false }: RestaurantGridProps) => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const L = (en: string, ur: string) => (lang === "ur" ? ur : en);
  const [selectedDish, setSelectedDish] = useState<{ item: MenuItem; restaurant: Restaurant } | null>(null);
  const { data: restaurants = [], isPending: loading, isError, refetch } = useQuery({
    queryKey: ["food-restaurant-list"],
    staleTime: 60_000,
    queryFn: async (): Promise<Restaurant[]> => {
      const { data: rests, error: restError } = await supabase
        .from("restaurants")
        .select("id, name, image_url, rating, delivery_time, cuisines, is_active, created_at, pickup_address, delivery_mode, description, pays_delivery_fee");

      if (restError) throw restError;
      if (rests?.length) {
        // Fetch menu items for all restaurants
        const ids = rests.map((r) => r.id);
        const { data: menus, error: menuError } = await supabase
          .from("menu_items")
          .select("id, name, price, restaurant_id, description, image_url, category, variants, option_groups")
          .in("restaurant_id", ids)
          .eq("is_available", true);
        if (menuError) throw menuError;

        const mapped: Restaurant[] = rests.map((r) => ({
          id: r.id,
          name: r.name,
          image: r.image_url || restaurantFallback,
          rating: r.rating || 0,
          deliveryTime: r.delivery_time || "30-45 min",
          cuisines: r.cuisines || [],
          isActive: r.is_active !== false,
          createdAt: r.created_at,
          pickupAddress: r.pickup_address,
          deliveryMode: r.delivery_mode,
          paysDeliveryFee: r.pays_delivery_fee === true,
          minPrice: foodStartingPrice((menus || []).filter((m) => m.restaurant_id === r.id)),
          menuItems: (menus || []).filter((m) => m.restaurant_id === r.id).map((m) => ({
            id: m.id, name: m.name, price: m.price,
            category: m.category,
            description: (m as any).description, image_url: (m as any).image_url,
            variants: ((m as any).variants || []) as any[],
            option_groups: ((m as any).option_groups || []) as any[],
          })),
        }));
        return mapped;
      } else {
        return [];
      }
    },
  });

  const filtered = restaurants.filter((r) => {
    const matchesCategory = matchesFoodCategory(activeCategory, [...r.cuisines, ...r.menuItems.flatMap(item => [item.name, item.category])]);
    const query = searchQuery.trim().toLowerCase();
    const matchesQuery = matchesSearch(query, r.name, ...r.cuisines) || r.menuItems.some(item => matchesSearch(query, item.name, item.description, item.category));
    let matchesQuick = true;
    if (quickFilter === "offers") matchesQuick = r.minPrice !== null && r.minPrice !== undefined && r.minPrice <= 500;
    else if (quickFilter === "new") matchesQuick = !!r.createdAt && Date.now() - new Date(r.createdAt).getTime() < 30 * 24 * 60 * 60 * 1000;
    else if (quickFilter === "pickup") matchesQuick = !!r.pickupAddress || r.deliveryMode === "self" || r.deliveryMode === "both";
    else if (quickFilter === "homechefs") matchesQuick = r.cuisines.some((c) => /home|chef|homemade|گھر|ہوم/i.test(c));
    else if (quickFilter === "top-rated") matchesQuick = (r.rating || 0) >= 4;
    return matchesCategory && matchesQuery && matchesQuick;
  });

  const quickLabels: Record<string, string> = {
    offers: L("From Rs. 500 or less", "ابتدائی قیمت Rs. 500 یا کم"),
    new: L("New restaurants", "نئے ریسٹورنٹس"),
    pickup: L("Pickup available", "پِک اپ دستیاب"),
    homechefs: L("Home chefs", "ہوم شیف"),
    "top-rated": L("Top rated", "ٹاپ ریٹڈ"),
  };

  const dishes = filtered.flatMap(restaurant => restaurant.menuItems
    .filter(item => matchesFoodCategory(activeCategory, [item.name, item.category]) && matchesSearch(searchQuery, item.name, item.description, item.category, restaurant.name))
    .map(item => ({ item, restaurant })));

  if (dishesOnly && !loading) return (
    <section className="container mx-auto max-w-5xl px-4 pb-16">
      <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-bold text-foreground">{L("Available dishes", "دستیاب ڈشیں")}</h2><span className="text-xs text-muted-foreground">{dishes.length} {L("dishes", "ڈشیں")} · {new Set(dishes.map(d => d.restaurant.id)).size} {L("restaurants", "ریسٹورنٹس")}</span></div>
      {isError ? <div className="py-10 text-center text-muted-foreground"><p>{L("Dishes could not load", "ڈشیں لوڈ نہیں ہو سکیں")}</p><Button variant="outline" onClick={() => void refetch()}>{L("Try again", "دوبارہ کوشش")}</Button></div> : dishes.length === 0 ? <CategoryEmptyState category={activeCategory} /> :
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{dishes.map(({ item, restaurant }) => <FoodDishCard key={item.id} item={item} restaurant={restaurant} onSelect={() => setSelectedDish({ item, restaurant })} onRestaurant={() => navigate(`/restaurant/${restaurant.id}`)} />)}</div>}
      <MenuItemSheet item={selectedDish?.item || null} restaurant={selectedDish ? { id: selectedDish.restaurant.id, name: selectedDish.restaurant.name } : null} onClose={() => setSelectedDish(null)} />
    </section>
  );

  if (loading) {
    return (
      <section className="container mx-auto px-4 pb-16">
        <RestaurantGridSkeleton count={6} />
      </section>
    );
  }

  return (
    <section id="food-results" className="container mx-auto px-4 pt-5 pb-12 min-h-[400px] scroll-mt-24">
      {isError && <div className="py-6 text-center text-muted-foreground"><p>{L("The list could not load", "فہرست لوڈ نہیں ہو سکی")}</p><Button variant="outline" onClick={() => void refetch()}>{L("Try again", "دوبارہ کوشش")}</Button></div>}
      {quickFilter && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-primary/30 bg-accent px-3 py-2 shadow-soft animate-fade-in">
          <span className="text-xs font-bold text-accent-foreground">{L("Filter", "فلٹر")}: {quickLabels[quickFilter]}</span>
          <span className="text-[11px] font-semibold text-muted-foreground">{filtered.length} {L("results", "نتائج")}</span>
          <Button variant="ghost" size="sm"
            onClick={() => onClearQuickFilter?.()}
            className="ms-auto bg-card text-xs font-bold text-primary"
          >
            {L("Remove", "ہٹائیں")} ✕
          </Button>
        </div>
      )}
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-5">
        <h2 className="min-w-0 break-words text-xl font-extrabold text-foreground">
          {searchQuery ? L(`Results for "${searchQuery}"`, `"${searchQuery}" کے نتائج`) : quickFilter ? quickLabels[quickFilter] : L("Restaurants", "ریسٹورنٹس")}
        </h2>
        <span className="text-muted-foreground text-sm">{filtered.length} {L("restaurants", "ریسٹورنٹس")}</span>
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-semibold mb-2">{L("No restaurant found", "کوئی ریسٹورنٹ نہیں ملا")}</p>
          <p className="text-sm">{L("Try a different search or category", "مختلف سرچ یا کیٹگری آزمائیں")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((r, i) => (
            <div key={r.id} className="min-w-0">
               <RestaurantCard restaurant={{ ...r, menuItems: r.menuItems.filter(item => matchesFoodCategory(activeCategory, [item.name, item.category]) && matchesSearch(searchQuery, item.name, item.description, item.category)).slice(0, 3) }} index={i} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default RestaurantGrid;
