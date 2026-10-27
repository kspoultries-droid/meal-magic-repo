import { img } from "@/lib/imageUrl";
import { Apple, Carrot, Milk, ShoppingBasket, Wheat, Star, Clock, Drumstick, Gift, Cake, Flower2, ArrowUpDown, MapPin, Percent, Flame, ChevronRight, TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import ServiceUnavailableNotice from "@/components/common/ServiceUnavailableNotice";
import { useCityServices } from "@/hooks/useCityServices";
import PageHero from "@/components/common/PageHero";
import PromotionalAds from "@/components/PromotionalAds";
import BottomTabBar from "@/components/BottomTabBar";
import AppShareButton from "@/components/AppShareButton";
import { StoreGridSkeleton } from "@/components/ui/skeleton-card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";


const groceryCategories = [
  { key: "grocery.cat.all", name: "All", icon: ShoppingBasket, filter: null },
  { key: "grocery.cat.grocery", name: "Grocery", icon: ShoppingBasket, filter: "General" },
  { key: "grocery.cat.meat", name: "Meat", icon: Drumstick, filter: "Eggs & Meat" },
  { key: "grocery.cat.vegetables", name: "Vegetables", icon: Carrot, filter: "Vegetables" },
  { key: "grocery.cat.fruits", name: "Fruits", icon: Apple, filter: "Fruits" },
  { key: "grocery.cat.dairy", name: "Dairy", icon: Milk, filter: "Dairy" },
  { key: "grocery.cat.attaRice", name: "Atta/Rice", icon: Wheat, filter: "Atta & Rice" },
  { key: "grocery.cat.cake", name: "Cake", icon: Cake, filter: "Cake" },
  { key: "grocery.cat.flowers", name: "Flowers", icon: Flower2, filter: "Flowers" },
  { key: "grocery.cat.gifts", name: "Gifts", icon: Gift, filter: "Gift" },
] as const;

const sortOptions = [
  { key: "grocery.sortDefault", value: "default" },
  { key: "grocery.sortRating", value: "rating" },
  { key: "grocery.sortNewest", value: "newest" },
] as const;

const Grocery = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [stores, setStores] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [topSelling, setTopSelling] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("default");
  const [loading, setLoading] = useState(true);
  const { groceryLive, city, cities: liveCities, setCityId } = useCityServices();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from("cities").select("id, name").then(({ data }) => setCities(data || []));
    supabase
      .from("grocery_products")
      .select("id, name, price, discount_price, image_url, unit, store_id, is_special_offer, sort_order")
      .eq("is_available", true)
      .eq("is_special_offer", true)
      .limit(2000)
      .then(({ data }) => {
        // ایک ہی آئٹم کئی دکانوں میں ہوتا ہے — نام کے حساب سے صرف بہترین (سب سے زیادہ رعایت / کم قیمت) رکھیں
        const best = new Map<string, any>();
        for (const p of data || []) {
          const key = (p.name || "").trim().toLowerCase();
          const eff = p.discount_price ?? p.price;
          const prev = best.get(key);
          if (!prev || eff < (prev.discount_price ?? prev.price)) best.set(key, p);
        }
        const list = Array.from(best.values())
          .map((p) => ({ ...p, _off: p.discount_price ? 1 - p.discount_price / p.price : 0 }))
          .sort((a, b) => b._off - a._off || (a.sort_order ?? 0) - (b.sort_order ?? 0));

        setDeals(list);
      });

    (supabase.rpc as any)("get_top_selling_grocery_products", { _limit: 12 }).then(({ data }: any) =>
      setTopSelling(data || [])
    );
  }, []);

  useEffect(() => {
    const fetchStores = async () => {
      setLoading(true);
      let query = supabase
        .from("grocery_stores")
        .select("id, name, category, image_url, rating, delivery_time, minimum_order, is_active")
        .neq("subscription_status", "paused")
        .or("store_type.is.null,store_type.eq.retail");
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

      const { data } = await query.limit(40);
      setStores(data || []);
      setLoading(false);
    };
    fetchStores();
  }, [activeCategory, searchQuery, selectedCity, sortBy]);

  const storeCount = stores.length;

  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />

      <PageHero
        title={t("grocery.title")}
        eyebrow={t("grocery.eyebrow")}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholders={[
          "آج گھر کے لیے کیا چاہیے؟",
          "تازہ دودھ، سبزی یا پھل؟",
          "آٹا، چاول یا مصالحے؟",
          "اپنی پسند کی شے لکھیں…",
        ]}
        features={[
          { emoji: "🥬", label: "روزانہ تازہ" },
          { emoji: "💸", label: "30% تک رعایت" },
          { emoji: "🚚", label: "مفت ڈیلیوری" },
          { emoji: "📸", label: "فوٹو لسٹ آرڈر" },
        ]}
        promos={[
          { emoji: "🥬", title: "روزانہ تازہ سبزی و پھل", subtitle: "Fresh daily from local markets" },
          { emoji: "💸", title: "منتخب اشیاء پر 30% تک رعایت", subtitle: "Up to 30% off on selected items" },
          { emoji: "🚚", title: "Rs 1000 سے اوپر مفت ڈیلیوری", subtitle: "Free delivery above Rs 1000" },
        ]}
      />


      {!groceryLive ? (
        <ServiceUnavailableNotice kind="grocery" city={city} cities={liveCities} onCityChange={setCityId} />
      ) : (
      <>
      {/* Sponsored Ads */}
      <PromotionalAds placement="grocery" />

      {/* Category rail */}
      <section className="container mx-auto px-4 py-4">
        <div className="flex items-baseline gap-2 mb-3">
          <h2 className="text-lg font-extrabold text-foreground">{t("grocery.category")}</h2>
          <span className="text-xs text-muted-foreground">{t("grocery.shopByCategory")}</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {groceryCategories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.filter;
            return (
              <Button variant="ghost"
                key={cat.name}
                onClick={() => setActiveCategory(isActive ? null : cat.filter)}
                className="flex h-auto flex-col items-center gap-1.5 shrink-0 w-[68px] whitespace-normal p-0 hover:bg-transparent [&_svg]:size-6"
              >
                <span
                  className={`w-14 h-14 rounded-lg flex items-center justify-center transition-all ${
                    isActive
                      ? "bg-gradient-primary text-primary-foreground shadow-glow scale-105"
                      : "bg-card border border-border/60 text-primary shadow-soft"
                  }`}
                >
                  <Icon className="w-6 h-6" />
                </span>
                <span className={`text-[10px] font-bold leading-tight text-center ${isActive ? "text-primary" : "text-foreground"}`}>
                  {t(cat.key)}
                </span>
              </Button>
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
                <Flame className="w-4 h-4 text-destructive" /> {t("grocery.todayDeals")}
              </h2>

            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {deals.map((p) => {
              const off = p.discount_price && p.price > p.discount_price
                ? Math.round(((p.price - p.discount_price) / p.price) * 100)
                : 0;
              return (
                <Button variant="ghost"
                  key={p.id}
                  onClick={() => navigate(`/product/${p.id}`)}
                  className="block h-auto whitespace-normal p-0 hover:bg-card w-36 shrink-0 bg-card rounded-lg border border-border shadow-soft overflow-hidden text-left active:scale-95 transition-transform"
                >
                  <div className="relative h-24 bg-secondary flex items-center justify-center overflow-hidden">
                    {p.image_url ? (
                      <img src={img(p.image_url, 360)} alt={p.name} loading="lazy" className="w-full h-full object-cover" />
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
                    <div className="flex flex-wrap items-baseline gap-1.5 mt-1">
                      <span className="text-sm font-extrabold text-primary">Rs {p.discount_price || p.price}</span>
                      {p.discount_price && (
                        <span className="text-[10px] text-muted-foreground line-through">Rs {p.price}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{p.unit}</p>
                  </div>
                </Button>
              );
            })}
          </div>
        </section>
      )}

      {/* Top selling products rail */}
      {topSelling.length > 0 && !searchQuery && (
        <section className="container mx-auto px-4 pb-4">
          <div className="flex items-baseline gap-2 mb-3">
            <h2 className="text-lg font-extrabold text-foreground flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-primary" /> {t("grocery.topSelling")}
            </h2>

          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {topSelling.map((p, i) => (
              <Button variant="ghost"
                key={p.id}
                onClick={() => navigate(`/product/${p.id}`)}
                className="block h-auto whitespace-normal p-0 hover:bg-card w-36 shrink-0 bg-card rounded-lg border border-border shadow-soft overflow-hidden text-left active:scale-95 transition-transform"
              >
                <div className="relative h-24 bg-secondary flex items-center justify-center overflow-hidden">
                  {p.image_url ? (
                    <img src={img(p.image_url, 360)} alt={p.name} loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <ShoppingBasket className="w-7 h-7 text-muted-foreground" />
                  )}
                  <span className="absolute top-1.5 left-1.5 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                    #{i + 1}
                  </span>
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-bold text-foreground truncate">{p.name}</p>
                  <div className="flex flex-wrap items-baseline gap-1.5 mt-1">
                    <span className="text-sm font-extrabold text-primary">Rs {p.discount_price || p.price}</span>
                    {p.discount_price && (
                      <span className="text-[10px] text-muted-foreground line-through">Rs {p.price}</span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{p.unit}</p>
                </div>
              </Button>
            ))}
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
                className="h-10 bg-card border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">{t("grocery.allCities")}</option>
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
                <Button variant="ghost"
                  key={opt.value}
                  onClick={() => setSortBy(opt.value)}
                  className={`h-10 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    sortBy === opt.value
                      ? "bg-gradient-primary text-primary-foreground shadow-glow"
                      : "bg-card border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t(opt.key)}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stores List */}
      <div className="container mx-auto px-4 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-extrabold text-foreground">
            {activeCategory ? `${activeCategory}` : t("grocery.allStores")}
          </h2>
          <span className="text-xs text-muted-foreground">{storeCount} {t("grocery.stores")}</span>
        </div>
        {loading ? (
          <StoreGridSkeleton count={6} />
        ) : stores.length === 0 ? (
          <div className="rounded-lg bg-gradient-primary p-6 text-center shadow-glow">
            <ShoppingBasket className="w-10 h-10 text-primary-foreground mx-auto mb-2" />
            <h3 className="text-lg font-extrabold text-primary-foreground mb-1">{t("grocery.comingSoon")}</h3>
            <p className="text-primary-foreground/80 text-xs">{t("grocery.noStores")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {stores.map((store, i) => (
              <Button variant="ghost"
                key={store.id}
                onClick={() => navigate(`/grocery/${store.id}`)}
                style={{ animationDelay: `${i * 50}ms` }}
                className={`animate-fade-in-up h-auto whitespace-normal hover:bg-card [&_svg]:size-4 w-full flex gap-3 bg-card rounded-lg border border-border shadow-soft hover:shadow-card transition-all p-2.5 text-left ${!store.is_active ? "opacity-60 grayscale" : ""}`}
              >
                <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-secondary shrink-0 flex items-center justify-center">
                  {store.image_url ? (
                    <img src={img(store.image_url, 360)} alt={store.name} loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <ShoppingBasket className="w-8 h-8 text-muted-foreground" />
                  )}
                  {!store.is_active && (
                    <div className="absolute inset-0 bg-foreground/50 backdrop-blur-[2px] flex items-center justify-center">
                      <span className="bg-destructive text-destructive-foreground text-[9px] font-bold px-2 py-0.5 rounded-md">{t("grocery.closed")}</span>
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
                        {t("grocery.min")} Rs {store.minimum_order}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground self-center shrink-0" />
              </Button>
            ))}
          </div>
        )}
      </div>

      </>
      )}
      <AppShareButton section="grocery" />
      <BottomTabBar />
    </div>
  );
};

export default Grocery;
