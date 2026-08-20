import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Store, Star, Truck, MapPin, Package } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import PageHero from "@/components/common/PageHero";
import BottomTabBar from "@/components/BottomTabBar";
import CartDrawer from "@/components/CartDrawer";
import AppShareButton from "@/components/AppShareButton";
import { StoreGridSkeleton } from "@/components/ui/skeleton-card";

const Wholesale = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [stores, setStores] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [shopCategories, setShopCategories] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeShopCategory, setActiveShopCategory] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from("cities").select("id, name").then(({ data }) => setCities(data || []));
    (supabase.from("wholesale_categories" as any).select("*").eq("is_active", true).order("sort_order") as any).then(({ data }: any) => {
      const all = data || [];
      setCategories(all.filter((c: any) => (c.kind ?? "item") === "item"));
      setShopCategories(all.filter((c: any) => c.kind === "shop"));
    });
  }, []);

  useEffect(() => {
    const fetchStores = async () => {
      setLoading(true);
      let query: any = supabase
        .from("grocery_stores")
        .select("*")
        .eq("store_type", "wholesale")
        .neq("subscription_status", "paused");
      if (selectedCity) query = query.eq("city_id", selectedCity);
      if (activeCategory && activeCategory !== "All") query = query.eq("category", activeCategory);
      if (activeShopCategory) query = query.eq("shop_category", activeShopCategory);
      if (searchQuery) query = query.ilike("name", `%${searchQuery}%`);
      query = query.order("sort_order").order("created_at", { ascending: false });

      const { data } = await query;
      setStores(data || []);
      setLoading(false);
    };
    fetchStores();
  }, [searchQuery, selectedCity, activeCategory, activeShopCategory]);


  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />

      <PageHero
        title="ہول سیل بازار / Bazar"
        eyebrow="بولٹن مارکیٹ کراچی • شاہ عالمی لاہور • کارخانہ بازار فیصل آباد"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholders={[
          "ہول سیل دکان تلاش کریں…",
          "کریانہ ہول سیلر تلاش کریں…",
          "الیکٹرانکس تلاش کریں…",
          "کپڑے / اسٹیشنری تلاش کریں…",
        ]}
        promos={[
          { emoji: "📦", title: "تھوک ریٹ پر پورے پاکستان ڈیلیوری", subtitle: "Wholesale rates, nationwide shipping" },
          { emoji: "🤝", title: "تصدیق شدہ ہول سیلرز", subtitle: "Verified wholesalers only" },
          { emoji: "🧾", title: "کم سے کم آرڈر پر خاص رعایت", subtitle: "Special discount on bulk MOQ" },
        ]}
      />

      {/* Shop-wise Categories */}
      {shopCategories.length > 0 && (
        <section className="container mx-auto px-4 pt-3">
          <h2 className="text-xs font-extrabold text-foreground mb-2">دکان کی قسم / Shop Type</h2>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setActiveShopCategory(null)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-semibold whitespace-nowrap transition-all shrink-0 min-w-[64px] ${
                !activeShopCategory ? "bg-primary text-primary-foreground shadow-md scale-105" : "bg-card text-foreground border hover:bg-accent"
              }`}
            >
              <Store className="w-5 h-5" />
              <span>All</span>
              <span className="text-[8px] opacity-70">سب</span>
            </button>
            {shopCategories.map((cat) => {
              const Icon = (LucideIcons as any)[cat.icon] || Store;
              const isActive = activeShopCategory === cat.name;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveShopCategory(isActive ? null : cat.name)}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-semibold whitespace-nowrap transition-all shrink-0 min-w-[64px] ${
                    isActive ? "bg-primary text-primary-foreground shadow-md scale-105" : "bg-card text-foreground border hover:bg-accent"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{cat.name}</span>
                  {cat.name_ur && <span className="text-[8px] opacity-70">{cat.name_ur}</span>}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Item Category Chips */}

      {categories.length > 0 && (
        <section className="container mx-auto px-4 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {categories.map((cat) => {
              const Icon = (LucideIcons as any)[cat.icon] || Package;
              const isActive = activeCategory === cat.name || (cat.name === "All" && !activeCategory);
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.name === "All" ? null : cat.name)}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-semibold whitespace-nowrap transition-all shrink-0 min-w-[64px] ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md scale-105"
                      : "bg-card text-foreground border hover:bg-accent"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{cat.name}</span>
                  {cat.name_ur && <span className="text-[8px] opacity-70">{cat.name_ur}</span>}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* City Filter */}
      {cities.length > 0 && (
        <div className="container mx-auto px-4 py-3 flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
          <select
            value={selectedCity || ""}
            onChange={(e) => setSelectedCity(e.target.value || null)}
            className="bg-card border rounded-full px-3 py-1.5 text-xs text-foreground outline-none"
          >
            <option value="">تمام شہر / All Cities</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Stores */}
      <div className="container mx-auto px-4 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-extrabold text-foreground">ہول سیل دکانیں / Wholesale Vendors</h2>
          <span className="text-xs text-muted-foreground">{stores.length} stores</span>
        </div>

        {loading ? (
          <StoreGridSkeleton count={6} />
        ) : stores.length === 0 ? (
          <div className="rounded-2xl bg-gradient-to-r from-primary to-primary/80 p-6 text-center">
            <Package className="w-10 h-10 text-primary-foreground mx-auto mb-2" />
            <h3 className="text-lg font-extrabold text-primary-foreground mb-1">جلد آرہا ہے!</h3>
            <p className="text-primary-foreground/90 text-xs mb-3">کراچی سدر بازار اور پاکستان بھر کے wholesale dealers جلد دستیاب</p>
            <p className="text-primary-foreground/80 text-[11px]">ہول سیل دکاندار ہیں؟ ایڈمن سے رابطہ کریں اپنی دکان رجسٹر کرنے کے لیے۔</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {stores.map((store) => (
              <button
                key={store.id}
                onClick={() => navigate(`/grocery/${store.id}`)}
                className={`bg-card rounded-2xl border overflow-hidden hover:shadow-md transition-shadow text-left ${!store.is_active ? "opacity-60 grayscale" : ""}`}
              >
                <div className="w-full h-24 bg-secondary flex items-center justify-center overflow-hidden relative">
                  {store.image_url ? (
                    <img src={store.image_url} alt={store.name} className="w-full h-full object-cover" />
                  ) : (
                    <Store className="w-8 h-8 text-muted-foreground" />
                  )}
                  <span className="absolute top-1.5 left-1.5 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                    WHOLESALE
                  </span>
                  {store.ships_nationwide && (
                    <span className="absolute top-1.5 right-1.5 bg-background/90 text-primary text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                      <Truck className="w-2.5 h-2.5" /> PK
                    </span>
                  )}
                </div>
                <div className="p-2.5">
                  <h3 className="font-bold text-foreground text-sm truncate">{store.name}</h3>
                  <p className="text-[10px] text-muted-foreground truncate">{store.category}</p>
                  <div className="flex items-center justify-between mt-1">
                    {store.rating > 0 ? (
                      <span className="flex items-center gap-0.5 text-[10px] font-semibold">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" /> {store.rating}
                      </span>
                    ) : <span />}
                    {store.minimum_order > 0 && (
                      <span className="text-[9px] text-destructive font-bold">Min Rs {store.minimum_order}</span>
                    )}
                  </div>
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

export default Wholesale;
