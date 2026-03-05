import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import RestaurantCard from "./RestaurantCard";

export interface MenuItem {
  id: string;
  name: string;
  price: number;
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
}

interface RestaurantGridProps {
  searchQuery: string;
  activeCategory: string;
}

const RestaurantGrid = ({ searchQuery, activeCategory }: RestaurantGridProps) => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRestaurants = async () => {
      setLoading(true);
      const { data: rests } = await supabase
        .from("restaurants")
        .select("id, name, image_url, rating, delivery_time, cuisines, is_active")
        .eq("is_active", true);

      if (rests?.length) {
        // Fetch menu items for all restaurants
        const ids = rests.map((r) => r.id);
        const { data: menus } = await supabase
          .from("menu_items")
          .select("id, name, price, restaurant_id")
          .in("restaurant_id", ids)
          .eq("is_available", true);

        const mapped: Restaurant[] = rests.map((r) => ({
          id: r.id,
          name: r.name,
          image: r.image_url || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&h=350&fit=crop",
          rating: r.rating || 0,
          deliveryTime: r.delivery_time || "30-45 min",
          cuisines: r.cuisines || [],
          menuItems: (menus || []).filter((m) => m.restaurant_id === r.id).slice(0, 3).map((m) => ({ id: m.id, name: m.name, price: m.price })),
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
    const matchesSearch = searchQuery === "" || r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.cuisines.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <section className="container mx-auto px-4 pb-16">
        <div className="text-center py-16 text-muted-foreground">لوڈ ہو رہا ہے...</div>
      </section>
    );
  }

  return (
    <section className="container mx-auto px-4 pb-16">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-extrabold text-foreground">
          {searchQuery ? `"${searchQuery}" کے نتائج` : "آپ کے قریب مشہور"}
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
              <RestaurantCard restaurant={r} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default RestaurantGrid;
