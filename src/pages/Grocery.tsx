import { Search, Apple, Carrot, Milk, ShoppingBasket, Wheat, Star, Clock, Drumstick, Gift, Cake, Flower2, ArrowUpDown, MapPin } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import PromotionalAds from "@/components/PromotionalAds";
import BottomTabBar from "@/components/BottomTabBar";
import CartDrawer from "@/components/CartDrawer";
import AppShareButton from "@/components/AppShareButton";

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

const sortOptions = [
  { label: "ترتیب", labelEn: "Default", value: "default" },
  { label: "ریٹنگ", labelEn: "Rating", value: "rating" },
  { label: "نئے", labelEn: "Newest", value: "newest" },
];

const Grocery = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [stores, setStores] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("default");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from("cities").select("id, name").then(({ data }) => setCities(data || []));
  }, []);

  useEffect(() => {
    const fetchStores = async () => {
      setLoading(true);
      let query = supabase.from("grocery_stores").select("*").eq("is_active", true).neq("subscription_status", "paused");
      if (activeCategory) query = query.eq("category", activeCategory);
      if (selectedCity) query = query.eq("city_id", selectedCity);
      if (searchQuery) query = query.ilike("name", `%${searchQuery}%`);

      if (sortBy === "rating") {
        query = query.order("rating", { ascending: false, nullsFirst: false });
      } else if (sortBy === "newest") {
        query = query.order("created_at", { ascending: false });
      } else {
        query = query.order("sort_order", { ascending: true }).order("created_at", { ascending: false });
      }

      const { data } = await query;
      setStores(data || []);
      setLoading(false);
    };
    fetchStores();
  }, [activeCategory, searchQuery, selectedCity, sortBy]);

  const storeCount = stores.length;

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
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-muted-foreground text-xs shrink-0">✕</button>
          )}
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
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-semibold whitespace-nowrap transition-all shrink-0 min-w-[60px] ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md scale-105"
                    : "bg-card text-foreground border hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{cat.name}</span>
                <span className="text-[8px] opacity-70">{cat.nameUr}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Filters Row: City + Sort */}
      <div className="container mx-auto px-4 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
          {/* City filter */}
          {cities.length > 0 && (
            <div className="flex items-center gap-1.5 shrink-0">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
              <select
                value={selectedCity || ""}
                onChange={(e) => setSelectedCity(e.target.value || null)}
                className="bg-card border rounded-full px-3 py-1.5 text-xs text-foreground outline-none"
              >
                <option value="">تمام شہر</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Sort */}
          <div className="flex items-center gap-1.5 shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
            <div className="flex gap-1">
              {sortOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSortBy(opt.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    sortBy === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.labelEn}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stores List */}
      <div className="container mx-auto px-4 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-extrabold text-foreground">
            {activeCategory ? `${activeCategory} Stores` : "All Stores / تمام اسٹورز"}
          </h2>
          <span className="text-xs text-muted-foreground">{storeCount} stores</span>
        </div>
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
                <div className="w-full h-24 bg-secondary flex items-center justify-center overflow-hidden relative">
                  {store.image_url ? (
                    <img src={store.image_url} alt={store.name} className="w-full h-full object-cover" />
                  ) : (
                    <ShoppingBasket className="w-8 h-8 text-muted-foreground" />
                  )}
                  {store.rating > 0 && (
                    <span className="absolute top-1.5 right-1.5 bg-background/80 backdrop-blur-sm rounded-full px-1.5 py-0.5 text-[10px] font-bold flex items-center gap-0.5">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" /> {store.rating}
                    </span>
                  )}
                </div>
                <div className="p-2.5">
                  <h3 className="font-bold text-foreground text-sm truncate">{store.name}</h3>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
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
      <AppShareButton section="grocery" />
      <BottomTabBar />
    </div>
  );
};

export default Grocery;
