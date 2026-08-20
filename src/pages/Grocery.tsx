import { Search, Apple, Carrot, Milk, ShoppingBasket, Wheat, Star, Clock, Drumstick, Gift, Cake, Flower2, ArrowUpDown, MapPin, Percent, Flame, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import PromotionalAds from "@/components/PromotionalAds";
import BottomTabBar from "@/components/BottomTabBar";
import CartDrawer from "@/components/CartDrawer";
import AppShareButton from "@/components/AppShareButton";
import { StoreGridSkeleton } from "@/components/ui/skeleton-card";

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
  const [deals, setDeals] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("default");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from("cities").select("id, name").then(({ data }) => setCities(data || []));
    supabase
      .from("grocery_products")
      .select("id, name, price, discount_price, image_url, unit, store_id, is_special_offer")
      .eq("is_available", true)
      .eq("is_special_offer", true)
      .order("sort_order", { ascending: true })
      .limit(12)
      .then(({ data }) => setDeals(data || []));
  }, []);

  useEffect(() => {
    const fetchStores = async () => {
      setLoading(true);
      let query = supabase.from("grocery_stores").select("*").neq("subscription_status", "paused").or("store_type.is.null,store_type.eq.retail");
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
    <div className="min-h-screen bg-background pb-24">
      <Navbar />

      {/* Sticky Search */}
      <div className="sticky top-0 z-30 bg-primary/95 backdrop-blur-md px-4 pb-3 pt-2 shadow-soft">
        <div className="flex items-center gap-3 bg-card rounded-2xl px-4 py-2.5 shadow-card">
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

      {/* Category rail */}
      <section className="container mx-auto px-4 py-4">
        <div className="flex items-baseline gap-2 mb-3">
          <h2 className="text-lg font-extrabold text-foreground">کیٹیگری</h2>
          <span className="text-xs text-muted-foreground">Shop by category</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {groceryCategories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.filter;
            return (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(isActive ? null : cat.filter)}
                className="flex flex-col items-center gap-1.5 shrink-0 w-[68px] active:scale-95 transition-transform"
              >
                <span
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                    isActive
                      ? "bg-gradient-primary text-primary-foreground shadow-glow scale-105"
                      : "bg-card border border-border/60 text-primary shadow-soft"
                  }`}
                >
                  <Icon className="w-6 h-6" />
                </span>
                <span className={`text-[10px] font-bold leading-tight text-center ${isActive ? "text-primary" : "text-foreground"}`}>
                  {cat.nameUr}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Deals / Top selling products rail */}
      {deals.length > 0 && !searchQuery && (
        <section className="container mx-auto px-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-baseline gap-2">
              <h2 className="text-lg font-extrabold text-foreground flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-destructive" /> آج کی ڈیلز
              </h2>
              <span className="text-xs text-muted-foreground">Top deals</span>
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {deals.map((p) => {
              const off = p.discount_price && p.price > p.discount_price
                ? Math.round(((p.price - p.discount_price) / p.price) * 100)
                : 0;
              return (
                <button
                  key={p.id}
                  onClick={() => navigate(`/grocery/${p.store_id}`)}
                  className="w-36 shrink-0 bg-gradient-card rounded-2xl border border-border/60 shadow-card overflow-hidden text-left active:scale-95 transition-transform"
                >
                  <div className="relative h-24 bg-secondary flex items-center justify-center overflow-hidden">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <ShoppingBasket className="w-7 h-7 text-muted-foreground" />
                    )}
                    {off > 0 && (
                      <span className="absolute top-1.5 left-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                        <Percent className="w-2.5 h-2.5" />{off}%
                      </span>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-bold text-foreground truncate">{p.name}</p>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-sm font-extrabold text-primary">Rs {p.discount_price || p.price}</span>
                      {p.discount_price && (
                        <span className="text-[10px] text-muted-foreground line-through">Rs {p.price}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{p.unit}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Filters Row: City + Sort */}
      <div className="container mx-auto px-4 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
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

          <div className="flex items-center gap-1.5 shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
            <div className="flex gap-1">
              {sortOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSortBy(opt.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    sortBy === opt.value
                      ? "bg-gradient-primary text-primary-foreground shadow-glow"
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
            {activeCategory ? `${activeCategory} Stores` : "تمام اسٹورز"}
          </h2>
          <span className="text-xs text-muted-foreground">{storeCount} stores</span>
        </div>
        {loading ? (
          <StoreGridSkeleton count={6} />
        ) : stores.length === 0 ? (
          <div className="rounded-2xl bg-gradient-primary p-6 text-center shadow-glow">
            <ShoppingBasket className="w-10 h-10 text-primary-foreground mx-auto mb-2" />
            <h3 className="text-lg font-extrabold text-primary-foreground mb-1">Coming Soon!</h3>
            <p className="text-primary-foreground/80 text-xs">ابھی کوئی اسٹور نہیں</p>
          </div>
        ) : (
          <div className="space-y-3">
            {stores.map((store, i) => (
              <button
                key={store.id}
                onClick={() => navigate(`/grocery/${store.id}`)}
                style={{ animationDelay: `${i * 50}ms` }}
                className={`animate-fade-in-up w-full flex gap-3 bg-gradient-card rounded-2xl border border-border/60 shadow-card hover:shadow-elegant transition-all p-2.5 text-left ${!store.is_active ? "opacity-60 grayscale" : ""}`}
              >
                <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-secondary shrink-0 flex items-center justify-center">
                  {store.image_url ? (
                    <img src={store.image_url} alt={store.name} loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <ShoppingBasket className="w-8 h-8 text-muted-foreground" />
                  )}
                  {!store.is_active && (
                    <div className="absolute inset-0 bg-foreground/50 backdrop-blur-[2px] flex items-center justify-center">
                      <span className="bg-destructive text-destructive-foreground text-[9px] font-bold px-2 py-0.5 rounded-md">بند</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 py-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-extrabold text-foreground text-sm truncate">{store.name}</h3>
                    {store.rating > 0 && (
                      <span className="flex items-center gap-0.5 text-[11px] font-bold text-foreground shrink-0">
                        <Star className="w-3 h-3 text-warning fill-warning" /> {store.rating}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-primary font-semibold mt-0.5">{store.category}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="flex items-center gap-1 text-[10px] font-bold text-accent-foreground bg-accent rounded-full px-2 py-0.5">
                      <Clock className="w-3 h-3" /> {store.delivery_time}
                    </span>
                    {store.minimum_order > 0 && (
                      <span className="text-[10px] font-semibold text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                        Min Rs {store.minimum_order}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground self-center shrink-0" />
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
