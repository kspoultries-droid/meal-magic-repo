import { Search, Apple, Carrot, Milk, Egg, ShoppingBasket, Wheat, Star, Clock, ChevronRight, Drumstick, Gift, Cake, Flower2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import PromotionalAds from "@/components/PromotionalAds";
import BottomTabBar from "@/components/BottomTabBar";
import CartDrawer from "@/components/CartDrawer";

const groceryCategories = [
  { name: "All", nameUr: "سب", icon: ShoppingBasket, filter: null },
  { name: "Grocery", nameUr: "گروسری", icon: ShoppingBasket, filter: "General" },
  { name: "Meat", nameUr: "گوشت", icon: Drumstick, filter: "Eggs & Meat" },
  { name: "Vegetables", nameUr: "سبزیاں", icon: Carrot, filter: "Vegetables" },
  { name: "Fruits", nameUr: "پھل", icon: Apple, filter: "Fruits" },
  { name: "Dairy", nameUr: "دودھ", icon: Milk, filter: "Dairy" },
  { name: "Atta/Rice", nameUr: "آٹا چاول", icon: Wheat, filter: "Atta & Rice" },
  { name: "Cake", nameUr: "کیک", icon: Cake, filter: "Cake" },
  { name: "Flowers", nameUr: "پھول", icon: Flower2, filter: "Flowers" },
  { name: "Gifts", nameUr: "گفٹ", icon: Gift, filter: "Gift" },
];

const Grocery = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [stores, setStores] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStores = async () => {
      setLoading(true);
      let query = supabase.from("grocery_stores").select("*").eq("is_active", true).neq("subscription_status", "paused");
      if (activeCategory) query = query.eq("category", activeCategory);
      if (searchQuery) query = query.ilike("name", `%${searchQuery}%`);
      const { data } = await query.order("sort_order", { ascending: true }).order("created_at", { ascending: false });
      setStores(data || []);
      setLoading(false);
    };
    fetchStores();
  }, [activeCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />

      {/* Compact Search Bar */}
      <div className="bg-primary px-4 pb-4">
        <div className="flex items-center gap-3 bg-card rounded-full px-4 py-2.5 shadow">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stores / اسٹور تلاش کریں..."
            className="w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-sm"
          />
        </div>
      </div>

      {/* Sponsored Ads */}
      <PromotionalAds placement="grocery" />

      {/* Horizontal Category Chips */}
      <section className="container mx-auto px-4 py-4">
        <h2 className="text-lg font-extrabold text-foreground mb-3">Shop by Category / کیٹیگری</h2>
        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide">
          {groceryCategories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.filter;
            return (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(isActive ? null : cat.filter)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-card text-foreground border hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {cat.name}
              </button>
            );
          })}
        </div>
      </section>

      {/* Stores List */}
      <div className="container mx-auto px-4 pb-6">
        <h2 className="text-lg font-extrabold text-foreground mb-3">
          {activeCategory ? `${activeCategory} Stores` : "All Stores / تمام اسٹورز"}
        </h2>
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-36 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : stores.length === 0 ? (
          <div className="rounded-2xl bg-gradient-to-r from-primary to-primary/80 p-6 text-center">
            <ShoppingBasket className="w-10 h-10 text-primary-foreground mx-auto mb-2" />
            <h3 className="text-lg font-extrabold text-primary-foreground mb-1">Coming Soon!</h3>
            <p className="text-primary-foreground/80 text-xs">ابھی کوئی اسٹور نہیں</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {stores.map((store) => (
              <button
                key={store.id}
                onClick={() => navigate(`/grocery/${store.id}`)}
                className="bg-card rounded-2xl border overflow-hidden hover:shadow-md transition-shadow text-left"
              >
                <div className="w-full h-24 bg-secondary flex items-center justify-center overflow-hidden">
                  {store.image_url ? (
                    <img src={store.image_url} alt={store.name} className="w-full h-full object-cover" />
                  ) : (
                    <ShoppingBasket className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div className="p-2.5">
                  <h3 className="font-bold text-foreground text-sm truncate">{store.name}</h3>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
                    <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-yellow-500" /> {store.rating || "New"}</span>
                    <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> {store.delivery_time}</span>
                  </div>
                  <span className="text-[10px] text-primary font-semibold">{store.category}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <CartDrawer />
      <BottomTabBar />
    </div>
  );
};

export default Grocery;
