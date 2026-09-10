import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import RestaurantCard from "./RestaurantCard";
import { RestaurantGridSkeleton } from "./ui/skeleton-card";
import type { QuickFilter } from "./QuickCategories";

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  description?: string | null;
  image_url?: string | null;
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
}

const RestaurantGrid = ({ searchQuery, activeCategory, quickFilter = null, onClearQuickFilter }: RestaurantGridProps) => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRestaurants = async () => {
      setLoading(true);
      const { data: rests } = await supabase
        .from("restaurants")
        .select("id, name, image_url, rating, delivery_time, cuisines, is_active, created_at, pickup_address, delivery_mode, description, pays_delivery_fee");

      if (rests?.length) {
        // Fetch menu items for all restaurants
        const ids = rests.map((r) => r.id);
        const { data: menus } = await supabase
          .from("menu_items")
          .select("id, name, price, restaurant_id, description, image_url, variants, option_groups")
          .in("restaurant_id", ids)
          .eq("is_available", true);

        const mapped: Restaurant[] = rests.map((r) => ({
          id: r.id,
          name: r.name,
          image: r.image_url || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&h=350&fit=crop",
          rating: r.rating || 0,
          deliveryTime: r.delivery_time || "30-45 min",
          cuisines: r.cuisines || [],
          isActive: r.is_active !== false,
          createdAt: r.created_at,
          pickupAddress: r.pickup_address,
          deliveryMode: r.delivery_mode,
          paysDeliveryFee: r.pays_delivery_fee === true,
          minPrice: (menus || []).filter((m) => m.restaurant_id === r.id).reduce<number | null>((min, m) => (min === null || m.price < min ? m.price : min), null),
          menuItems: (menus || []).filter((m) => m.restaurant_id === r.id).map((m) => ({
            id: m.id, name: m.name, price: m.price,
            description: (m as any).description, image_url: (m as any).image_url,
            variants: ((m as any).variants || []) as any[],
            option_groups: ((m as any).option_groups || []) as any[],
          })),
        }));
        setRestaurants(mapped);
      } else {
        setRestaurants([]);
      }
      setLoading(false);
    };
    fetchRestaurants();
  }, []);

  const filtered = restaurants.filter((r) => {
    const matchesCategory = activeCategory === "All" || r.cuisines.some((c) => c.toLowerCase().includes(activeCategory.toLowerCase()));
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = query === "" || r.name.toLowerCase().includes(query) || r.cuisines.some((c) => c.toLowerCase().includes(query)) || r.menuItems.some((item) => item.name.toLowerCase().includes(query) || item.description?.toLowerCase().includes(query));
    let matchesQuick = true;
    if (quickFilter === "offers") matchesQuick = r.minPrice !== null && r.minPrice !== undefined && r.minPrice <= 500;
    else if (quickFilter === "new") matchesQuick = !!r.createdAt && Date.now() - new Date(r.createdAt).getTime() < 30 * 24 * 60 * 60 * 1000;
    else if (quickFilter === "pickup") matchesQuick = !!r.pickupAddress || r.deliveryMode === "self" || r.deliveryMode === "both";
    else if (quickFilter === "homechefs") matchesQuick = r.cuisines.some((c) => /home|chef|homemade|گھر|ہوم/i.test(c));
    else if (quickFilter === "top-rated") matchesQuick = (r.rating || 0) >= 4;
    return matchesCategory && matchesSearch && matchesQuick;
  });

  const quickLabels: Record<string, string> = {
    offers: "آفرز اور سستے سودے",
    new: "نئے ریسٹورنٹس",
    pickup: "پِک اپ دستیاب",
    homechefs: "ہوم شیف",
    "top-rated": "ٹاپ ریٹڈ",
  };

  if (loading) {
    return (
      <section className="container mx-auto px-4 pb-16">
        <RestaurantGridSkeleton count={6} />
      </section>
    );
  }

  return (
    <section id="food-results" className="container mx-auto px-4 pb-16 min-h-[400px] scroll-mt-16">
      {quickFilter && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-primary/30 bg-accent px-3 py-2 shadow-soft animate-fade-in">
          <span className="text-xs font-bold text-accent-foreground">فلٹر: {quickLabels[quickFilter]}</span>
          <span className="text-[11px] font-semibold text-muted-foreground">{filtered.length} نتائج</span>
          <button
            onClick={() => onClearQuickFilter?.()}
            className="ml-auto rounded-full bg-card px-3 py-1 text-[11px] font-bold text-primary shadow-soft active:scale-95 transition-transform"
          >
            ہٹائیں ✕
          </button>
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-extrabold text-foreground">
          {searchQuery ? `"${searchQuery}" کے نتائج` : quickFilter ? quickLabels[quickFilter] : "آپ کے قریب مشہور"}
        </h2>
        <span className="text-muted-foreground text-sm">{filtered.length} ریسٹورنٹس</span>
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-semibold mb-2">کوئی ریسٹورنٹ نہیں ملا</p>
          <p className="text-sm">مختلف سرچ یا کیٹگری آزمائیں</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((r, i) => (
            <div key={r.id} className="animate-fade-in-up cursor-pointer" style={{ animationDelay: `${i * 80}ms` }} onClick={() => navigate(`/restaurant/${r.id}`)}>
               <RestaurantCard restaurant={{ ...r, menuItems: searchQuery.trim() ? r.menuItems.filter((item) => item.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) || item.description?.toLowerCase().includes(searchQuery.trim().toLowerCase())).slice(0, 3) : r.menuItems.slice(0, 3) }} index={i} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default RestaurantGrid;
