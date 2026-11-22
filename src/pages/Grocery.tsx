import GroceryHeroSlider from "@/components/grocery/GroceryHeroSlider";
import { displayText } from "@/lib/i18n/displayText";
import GroceryPhoto from "@/components/grocery/GroceryPhoto";
import ShoppingAssistant from "@/components/assistant/ShoppingAssistant";
import { discoverGroceryProducts, groceryCategoryNames } from "@/lib/groceryDiscovery";
import { safeOperationSearch } from "@/lib/operationsList";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Apple, Carrot, Milk, ShoppingBasket, Wheat, Star, Clock, Drumstick, Gift, Cake, Flower2, ArrowUpDown, MapPin, Percent, Flame, ChevronRight, TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import ServiceUnavailableNotice from "@/components/common/ServiceUnavailableNotice";
import { useCityServices } from "@/hooks/useCityServices";
import { matchesSearch } from "@/lib/searchMatch";
import { Search, FileImage, X } from "lucide-react";
import PromotionalAds from "@/components/PromotionalAds";
import BottomTabBar from "@/components/BottomTabBar";
import AppShareButton from "@/components/AppShareButton";
import { StoreGridSkeleton } from "@/components/ui/skeleton-card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDeliveryLocation } from "@/hooks/useDeliveryLocation";
import { filterStoresByReach, etaFromKm } from "@/lib/groceryReach";
import { useCart } from "@/contexts/CartContext";
import { availableShopQuantity } from "@/lib/shopOrders";
import { toast } from "sonner";
import { Plus } from "lucide-react";


import catAll from "@/assets/grocery/cat-all.jpg";
import catGrocery from "@/assets/grocery/atta-rice.jpg";
import catMeat from "@/assets/meat/mutton.jpg";
import catVeg from "@/assets/grocery/vegetables.jpg";
import catFruit from "@/assets/grocery/fruits.jpg";
import catDairy from "@/assets/grocery/milk.jpg";
import catAtta from "@/assets/grocery/atta-10kg.jpg";
import catCake from "@/assets/grocery/cat-cake.jpg";
import catFlowers from "@/assets/grocery/cat-flowers.jpg";
import catGifts from "@/assets/grocery/cat-gifts.jpg";
const groceryCategories = [
  { key: "grocery.cat.all", name: "All", image: catAll, icon: ShoppingBasket, filter: null },
  { key: "grocery.cat.grocery", name: "Grocery", image: catGrocery, icon: ShoppingBasket, filter: "General" },
  { key: "grocery.cat.meat", name: "Meat", image: catMeat, icon: Drumstick, filter: "Eggs & Meat" },
  { key: "grocery.cat.vegetables", name: "Vegetables", image: catVeg, icon: Carrot, filter: "Vegetables" },
  { key: "grocery.cat.fruits", name: "Fruits", image: catFruit, icon: Apple, filter: "Fruits" },
  { key: "grocery.cat.dairy", name: "Dairy", image: catDairy, icon: Milk, filter: "Dairy" },
  { key: "grocery.cat.attaRice", name: "Atta/Rice", image: catAtta, icon: Wheat, filter: "Atta & Rice" },
  { key: "grocery.cat.cake", name: "Cake", image: catCake, icon: Cake, filter: "Cake" },
  { key: "grocery.cat.flowers", name: "Flowers", image: catFlowers, icon: Flower2, filter: "Flowers" },
  { key: "grocery.cat.gifts", name: "Gifts", image: catGifts, icon: Gift, filter: "Gift" },
] as const;

const Grocery = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [allProducts, setAllProducts] = useState<any[]>([]);
  useEffect(() => { const id = setTimeout(() => setDebounced(searchQuery.trim()), 300); return () => clearTimeout(id); }, [searchQuery]);
  const [stores, setStores] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [topSelling, setTopSelling] = useState<any[]>([]);
  const [rationOpen, setRationOpen] = useState(false);
  const [readError, setReadError] = useState(false);
  const [productLoading, setProductLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("default");
  const [openOnly, setOpenOnly] = useState(false);
  const [topRated, setTopRated] = useState(false);
  const [offersOnly, setOffersOnly] = useState(false);
  const [offerStoreIds, setOfferStoreIds] = useState<Set<string> | null>(null);
  const { addItem, items: cartItems } = useCart();
  useEffect(() => {
    if (!offersOnly || offerStoreIds) return;
    supabase.from("grocery_products").select("store_id").eq("is_available", true).not("discount_price", "is", null).limit(3000)
      .then(({ data }) => setOfferStoreIds(new Set((data || []).map((r: any) => r.store_id))));
  }, [offersOnly, offerStoreIds]);
  const [loading, setLoading] = useState(true);
  const { groceryLive, city, cities: liveCities, setCityId } = useCityServices();
  const { t, lang } = useLanguage();
  const L = (en: string, ur: string) => (lang === "ur" ? ur : en);
  const navigate = useNavigate();
  const { location: deliveryLoc } = useDeliveryLocation();
  const [cityLimits, setCityLimits] = useState<Record<string, number>>({});
  useEffect(() => {
    supabase.from("cities").select("id, grocery_max_km").then(({ data }) => {
      const m: Record<string, number> = {};
      (data || []).forEach((c: any) => { m[c.id] = Number(c.grocery_max_km) || 6; });
      setCityLimits(m);
    });
  }, []);

  useEffect(() => {
    supabase
      .from("grocery_products")
      .select("id, name, price, discount_price, image_url, unit, store_id, category, variants, stock_qty, weight_kg, weight, is_special_offer, sort_order, grocery_stores!inner(store_type)")
      .or("store_type.is.null,store_type.eq.retail", { referencedTable: "grocery_stores" })
      .eq("is_available", true)
      .eq("is_special_offer", true)
      .limit(2000)
      .then(({ data }) => {
        // Preserve each shop's item identity; never compare different pack sizes by name.
        const list = (data || [])
          .map((p) => ({ ...p, _off: p.discount_price ? 1 - p.discount_price / p.price : 0 }))
          .sort((a, b) => b._off - a._off || (a.sort_order ?? 0) - (b.sort_order ?? 0));

        setDeals(list);
      });

    (supabase.rpc as any)("get_top_selling_grocery_products", { _limit: 12 }).then(async ({ data }: any) => {
      if (!data?.length) return;
      const { data: products } = await supabase.from("grocery_products")
        .select("id, name, price, discount_price, image_url, unit, store_id, category")
        .in("id", data.map((p: any) => p.id)).eq("is_available", true);
      const current = new Map((products || []).map(p => [p.id, p]));
      setTopSelling(data.flatMap((p: any) => current.has(p.id) ? [current.get(p.id)] : []));
    });
  }, []);

  useEffect(() => {
    let obsolete = false;
    const fetchStores = async () => {
      setLoading(true);
      setReadError(false);
      let query = supabase.from("grocery_stores")
        .select("id, name, category, image_url, rating, delivery_time, minimum_order, is_active, pickup_lat, pickup_lng, city_id")
        .neq("subscription_status", "paused").or("store_type.is.null,store_type.eq.retail");
      if (sortBy === "rating") query = query.order("rating", { ascending: false, nullsFirst: false });
      else if (sortBy === "newest") query = query.order("created_at", { ascending: false });
      else query = query.order("sort_order").order("created_at", { ascending: false });
      const { data, error } = await query.limit(200);
      if (obsolete) return;
      if (error) setReadError(true); else setStores(data || []);
      setLoading(false);
    };
    fetchStores();
    return () => { obsolete = true; };
  }, [sortBy]);

  const reachableAll = filterStoresByReach(stores, deliveryLoc, cityLimits, sortBy === "default");
  const eligible = reachableAll.filter(x => (!openOnly || x.is_active) && (!topRated || Number(x.rating) >= 4.5) && (!offersOnly || (offerStoreIds?.has(x.id) ?? false)));
  const eligibleKey = eligible.map(s => s.id).sort().join(",");
  // Restrict discovery to reachable shops before bounded reads. Category loading is independent of prior search.
  useEffect(() => {
    let obsolete = false;
    const ids = eligibleKey ? eligibleKey.split(",") : [];
    if (!ids.length) { setAllProducts([]); setProductLoading(false); return; }
    const fetch = async () => {
      setProductLoading(true);
      let query = supabase.from("grocery_products")
        .select("id, name, price, discount_price, image_url, unit, store_id, category, weight_kg, weight, variants, stock_qty")
        .in("store_id", ids).eq("is_available", true);
      if (activeCategory) query = query.in("category", groceryCategoryNames(activeCategory));
      const needle = safeOperationSearch(debounced);
      if (needle) query = query.or(`name.ilike.%${needle}%,category.ilike.%${needle}%`);
      const { data, error } = await query.order("name").order("id").limit(120);
      if (obsolete) return;
      if (error) { setReadError(true); setAllProducts([]); } else setAllProducts(data || []);
      setProductLoading(false);
    };
    fetch();
    return () => { obsolete = true; };
  }, [eligibleKey, debounced, activeCategory]);

  const storeIds = new Set(eligible.map(x => x.id));
  const storeName = new Map(reachableAll.map(x => [x.id, x.name]));
  const relevantProducts = discoverGroceryProducts(allProducts, storeIds, activeCategory);
  const productHits = debounced ? relevantProducts.filter(p => matchesSearch(debounced, p.name, p.category)).slice(0, 40) : [];
  const categoryHits = !debounced && activeCategory ? relevantProducts.slice(0, 60) : [];
  const categoryStoreIds = new Set(relevantProducts.map(p => p.store_id));
  const reachable = activeCategory ? eligible.filter(s => groceryCategoryNames(activeCategory).includes(s.category) || categoryStoreIds.has(s.id)) : eligible;
  const hitStoreIds = new Set(productHits.map(p => p.store_id));
  const shownStores = debounced ? reachable.filter(x => hitStoreIds.has(x.id) || matchesSearch(debounced, x.name, x.category)) : reachable;
  const storeCount = shownStores.length;
  const visibleDeals = discoverGroceryProducts(deals, storeIds, activeCategory);
  const visibleTopSelling = discoverGroceryProducts(topSelling, storeIds, activeCategory);
  const activeLabel = groceryCategories.find(c => c.filter === activeCategory);
  const quickAdd = (p: any) => {
    if (Array.isArray(p.variants) && p.variants.some((v: any) => v && (v.label || v.name))) { navigate(`/product/${p.id}`); return; }
    const stock = availableShopQuantity(p);
    const inCart = cartItems.find((i) => i.menu_item_id === p.id && !i.variant_id)?.quantity || 0;
    if (stock !== null && inCart >= stock) { toast.error(L("No more stock available", "مزید مقدار دستیاب نہیں")); return; }
    addItem({ id: p.id, name: p.name, restaurant: storeName.get(p.store_id) || "Grocery", price: Number(p.discount_price || p.price), image: p.image_url || "", source: "grocery", sourceId: p.store_id, weight_kg: p.weight_kg, weight: p.weight, unit: p.unit });
  };
  const pill = (on: boolean) => `h-9 shrink-0 rounded-full px-3.5 text-xs font-bold transition-all ${on ? "bg-gradient-primary text-primary-foreground shadow-glow" : "border border-border bg-card text-foreground shadow-soft hover:bg-card"}`;

  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />

      <section className="px-3 pt-3">
        <GroceryHeroSlider />
        <label className="mx-auto mt-3 flex h-12 max-w-3xl items-center gap-2.5 rounded-full border border-border bg-card px-4 text-card-foreground shadow-soft focus-within:ring-2 focus-within:ring-ring">
          <Search className="size-5 shrink-0 text-primary" />
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={L("Search a shop or item (English / Urdu)", "دکان یا چیز تلاش کریں (اردو / English)")} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          {searchQuery && <Button variant="ghost" size="icon" type="button" aria-label={L("Clear", "صاف کریں")} onClick={() => setSearchQuery("")} className="grid size-7 place-items-center rounded-full bg-muted"><X className="size-3.5" /></Button>}
        </label>
      </section>


      {!groceryLive ? (
        <ServiceUnavailableNotice kind="grocery" city={city} cities={liveCities} onCityChange={setCityId} />
      ) : (
      <>
      <section className="container mx-auto flex flex-wrap items-center gap-2 px-4 py-3">
        <Button variant="outline" className="h-10 flex-1 gap-2 whitespace-normal text-xs" onClick={() => setRationOpen(true)}><FileImage className="size-4 shrink-0" />{L("Order from a ration list", "پرچی سے راشن منگوائیں")}</Button>
        <ShoppingAssistant inline />
        <AppShareButton section="grocery" inline />
      </section>
      {readError && <p role="alert" className="container mx-auto px-4 pb-3 text-sm text-destructive">{L("Could not refresh shops or items. Please refresh to retry.", "دکانیں یا اشیا تازہ نہیں ہوسکیں۔ دوبارہ کوشش کے لیے صفحہ ریفریش کریں۔")}</p>}
      {/* Sponsored Ads */}
      {!debounced && <PromotionalAds placement="grocery" />}

      {debounced && (
        <section className="container mx-auto px-4 pt-4">
          <h2 className="mb-2 text-base font-extrabold"><bdi>{productHits.length}</bdi> {L("shown items for", "دکھائی گئی اشیا برائے")} <bdi>“{debounced}”</bdi></h2>
          {productLoading ? <StoreGridSkeleton count={2} /> : productHits.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {productHits.map((p) => (
                <div key={p.id} className="relative">
                <Button variant="ghost" onClick={() => navigate(`/product/${p.id}`)} className="block h-auto overflow-hidden whitespace-normal w-full rounded-xl border bg-card p-0 text-start shadow-soft hover:bg-card">
                  <div className="relative h-28 overflow-hidden bg-card"><GroceryPhoto url={p.image_url} name={displayText(p.name)} category={p.category} /></div>
                  <div className="relative border-t bg-card p-2"><p dir="auto" className="line-clamp-2 min-h-[2rem] break-words text-xs font-bold leading-4">{displayText(p.name)}</p><p className="truncate text-[10px] text-muted-foreground"><bdi dir="auto">{storeName.get(p.store_id)}</bdi></p><p className="mt-1 text-sm font-extrabold text-primary">Rs {p.discount_price || p.price} <span className="text-[10px] font-normal text-muted-foreground">{p.unit}</span></p></div>
                </Button>
                <Button size="icon" aria-label={L("Add to cart", "ٹوکری میں ڈالیں")} onClick={() => quickAdd(p)} className="absolute end-2 top-[5.5rem] z-10 size-8 rounded-full bg-gradient-primary text-primary-foreground shadow-glow"><Plus className="size-4" /></Button>
                </div>
              ))}
            </div>
          ) : <p className="rounded-xl border bg-card py-6 text-center text-xs text-muted-foreground">{L("Nothing found — try another name in English or Urdu", "کوئی چیز نہیں ملی — اردو یا انگریزی میں دوسرا نام لکھیں")}</p>}
        </section>
      )}

      {/* Category rail */}
      <section className="container mx-auto px-4 py-4">
        <div className="flex items-baseline gap-2 mb-3">
          <h2 className="text-lg font-extrabold text-foreground">{t("grocery.category")}</h2>
          <span className="text-xs text-muted-foreground">{t("grocery.shopByCategory")}</span>
        </div>
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide snap-x">
          {groceryCategories.map((cat) => {
            const isActive = activeCategory === cat.filter;
            return (
              <Button variant="ghost"
                type="button"
                key={cat.name}
                aria-pressed={isActive}
                onClick={() => setActiveCategory(isActive ? null : cat.filter)}
                className="group h-auto p-0 hover:bg-transparent flex w-[78px] shrink-0 snap-start flex-col items-center gap-1.5 active:scale-95 transition-transform"
              >
                <span className={`relative h-[72px] w-[72px] overflow-hidden rounded-full border-2 bg-muted shadow-soft ${isActive ? "border-primary ring-2 ring-primary/40" : "border-card"}`}>
                  <img src={cat.image} alt={cat.name} loading="lazy" width={78} height={78} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                </span>
                <span className={`w-full truncate text-center text-[11px] font-bold ${isActive ? "text-primary" : "text-foreground"}`}>{t(cat.key)}</span>
              </Button>
            );
          })}
        </div>
      </section>
      {categoryHits.length > 0 && (
        <section className="container mx-auto px-4 pb-4">
          <h2 className="mb-2 text-base font-extrabold"><bdi>{categoryHits.length}</bdi> {L("shown items", "دکھائی گئی اشیا")}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {categoryHits.map((p) => (
              <div key={p.id} className="relative">
                <Button variant="ghost" onClick={() => navigate(`/product/${p.id}`)} className="block h-auto w-full overflow-hidden whitespace-normal rounded-xl border bg-card p-0 text-start shadow-soft hover:bg-card">
                  <div className="relative h-28 overflow-hidden bg-card"><GroceryPhoto url={p.image_url} name={displayText(p.name)} category={p.category} /></div>
                  <div className="relative border-t bg-card p-2"><p dir="auto" className="line-clamp-2 min-h-[2rem] break-words text-xs font-bold leading-4">{displayText(p.name)}</p><p className="truncate text-[10px] text-muted-foreground"><bdi dir="auto">{storeName.get(p.store_id)}</bdi></p><p className="mt-1 text-sm font-extrabold text-primary">Rs {p.discount_price || p.price}</p></div>
                </Button>
                <Button size="icon" aria-label={L("Add to cart", "ٹوکری میں ڈالیں")} onClick={() => quickAdd(p)} className="absolute end-2 top-[5.5rem] z-10 size-8 rounded-full bg-gradient-primary text-primary-foreground shadow-glow"><Plus className="size-4" /></Button>
              </div>
            ))}
          </div>
        </section>
      )}


      {/* Filter pills */}
      <div className="container mx-auto px-4 pb-3">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Button variant="ghost" onClick={() => setSortBy("default")} className={pill(sortBy === "default")}><MapPin className="size-3.5" /> {L("Nearest", "قریب ترین")}</Button>
          <Button variant="ghost" onClick={() => setOpenOnly((v) => !v)} className={pill(openOnly)}><Clock className="size-3.5" /> {L("Open now", "ابھی کھلی")}</Button>
          <Button variant="ghost" onClick={() => setOffersOnly((v) => !v)} className={pill(offersOnly)}><Percent className="size-3.5" /> {L("Offers", "آفرز")}</Button>
          <Button variant="ghost" onClick={() => setTopRated((v) => !v)} className={pill(topRated)}><Star className="size-3.5" /> {L("Rated 4.5+", "4.5+ ریٹنگ")}</Button>
          <Button variant="ghost" onClick={() => setSortBy("rating")} className={pill(sortBy === "rating")}><TrendingUp className="size-3.5" /> {L("Top rated first", "بہترین پہلے")}</Button>
          <Button variant="ghost" onClick={() => setSortBy("newest")} className={pill(sortBy === "newest")}><ArrowUpDown className="size-3.5" /> {L("Newest", "نئی دکانیں")}</Button>
        </div>
      </div>

      {/* Deals / Top selling products rail */}
      {visibleDeals.length > 0 && !debounced && (
        <section className="container mx-auto px-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-baseline gap-2">
              <h2 className="text-lg font-extrabold text-foreground flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-destructive" /> {t("grocery.todayDeals")}
              </h2>

            </div>
          </div>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
            {visibleDeals.map((p) => {
              const off = p.discount_price && p.price > p.discount_price
                ? Math.round(((p.price - p.discount_price) / p.price) * 100)
                : 0;
              return (
                <div key={p.id} className="relative w-36 shrink-0">
                <Button variant="ghost"
                  onClick={() => navigate(`/product/${p.id}`)}
                  className="block h-auto w-full whitespace-normal p-0 hover:bg-card bg-card rounded-lg border border-border shadow-soft overflow-hidden text-start active:scale-95 transition-transform"
                >
                  <div className="relative h-24 bg-card flex items-center justify-center overflow-hidden">
                    <GroceryPhoto url={p.image_url} name={displayText(p.name)} category={p.category} />
                    {off > 0 && (
                      <span className="absolute top-1.5 start-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                        <Percent className="w-2.5 h-2.5" />{off}%
                      </span>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p dir="auto" className="line-clamp-2 min-h-[2rem] break-words text-xs font-bold leading-4 text-foreground">{displayText(p.name)}</p>
                    <div className="flex flex-wrap items-baseline gap-1.5 mt-1">
                      <span className="text-sm font-extrabold text-primary">Rs {p.discount_price || p.price}</span>
                      {p.discount_price && (
                        <span className="text-[10px] text-muted-foreground line-through">Rs {p.price}</span>
                      )}
                    </div>
                    <p className="truncate text-[10px] text-muted-foreground"><bdi>{storeName.get(p.store_id)}</bdi></p><p className="text-[10px] text-muted-foreground">{p.unit}</p>
                  </div>
                </Button>
                <Button size="icon" aria-label={L("Add to cart", "ٹوکری میں ڈالیں")} onClick={() => quickAdd(p)} className="absolute end-2 top-[4.6rem] size-8 rounded-full bg-gradient-primary text-primary-foreground shadow-glow"><Plus className="size-4" /></Button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Top selling products rail */}
      {visibleTopSelling.length > 0 && !debounced && (
        <section className="container mx-auto px-4 pb-4">
          <div className="flex items-baseline gap-2 mb-3">
            <h2 className="text-lg font-extrabold text-foreground flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-primary" /> {t("grocery.topSelling")}
            </h2>

          </div>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
            {visibleTopSelling.map((p, i) => (
              <Button variant="ghost"
                key={p.id}
                onClick={() => navigate(`/product/${p.id}`)}
                className="block h-auto whitespace-normal p-0 hover:bg-card w-36 shrink-0 bg-card rounded-lg border border-border shadow-soft overflow-hidden text-start active:scale-95 transition-transform"
              >
                <div className="relative h-24 bg-card flex items-center justify-center overflow-hidden">
                  <GroceryPhoto url={p.image_url} name={displayText(p.name)} category={p.category} />
                  <span className="absolute top-1.5 start-1.5 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                    #{i + 1}
                  </span>
                </div>
                <div className="p-2.5">
                  <p dir="auto" className="line-clamp-2 min-h-[2rem] break-words text-xs font-bold leading-4 text-foreground">{displayText(p.name)}</p>
                  <div className="flex flex-wrap items-baseline gap-1.5 mt-1">
                    <span className="text-sm font-extrabold text-primary">Rs {p.discount_price || p.price}</span>
                    {p.discount_price && (
                      <span className="text-[10px] text-muted-foreground line-through">Rs {p.price}</span>
                    )}
                  </div>
                  <p className="truncate text-[10px] text-muted-foreground"><bdi>{storeName.get(p.store_id)}</bdi></p><p className="text-[10px] text-muted-foreground">{p.unit}</p>
                </div>
              </Button>
            ))}
          </div>
        </section>
      )}



      {/* Stores List */}
      <div id="grocery-stores" className="container mx-auto scroll-mt-20 px-4 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-extrabold text-foreground">
            {activeCategory && activeLabel ? t(activeLabel.key) : t("grocery.allStores")}
          </h2>
          <span className="text-xs text-muted-foreground">{storeCount} {t("grocery.stores")}</span>
        </div>
        {loading || (activeCategory && productLoading) ? (
          <StoreGridSkeleton count={6} />
        ) : shownStores.length === 0 ? (
          debounced || activeCategory || openOnly || topRated || offersOnly ? (
            <div className="rounded-xl border bg-card py-6 text-center text-xs text-muted-foreground">{L("No shop matches — clear search or filters", "کوئی دکان نہیں ملی — تلاش یا فلٹر ہٹائیں")}</div>
          ) : (
          <div className="rounded-lg bg-gradient-primary p-6 text-center shadow-glow">
            <ShoppingBasket className="w-10 h-10 text-primary-foreground mx-auto mb-2" />
            <h3 className="text-lg font-extrabold text-primary-foreground mb-1">{t("grocery.comingSoon")}</h3>
            <p className="text-primary-foreground/80 text-xs">{t("grocery.noStores")}</p>
          </div>
          )
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {shownStores.map((store, i) => (
              <Button variant="ghost"
                key={store.id}
                onClick={() => navigate(`/grocery/${store.id}${activeCategory ? `?cat=${encodeURIComponent(activeCategory)}` : ""}`)}
                style={{ animationDelay: `${i * 50}ms` }}
                className={`animate-fade-in-up h-auto whitespace-normal hover:bg-card [&_svg]:size-4 w-full flex gap-3 bg-card rounded-lg border border-border shadow-soft hover:shadow-card transition-all p-2.5 text-start ${!store.is_active ? "opacity-60 grayscale" : ""}`}
              >
                <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-secondary shrink-0 flex items-center justify-center">
                  <GroceryPhoto url={store.image_url} name={store.name} category={store.category} cover />
                  {!store.is_active && (
                    <div className="absolute inset-0 bg-foreground/50 backdrop-blur-[2px] flex items-center justify-center">
                      <span className="bg-destructive text-destructive-foreground text-[9px] font-bold px-2 py-0.5 rounded-md">{t("grocery.closed")}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 py-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-extrabold text-foreground text-sm line-clamp-2 leading-snug">{store.name}</h3>
                    {store.rating > 0 && (
                      <span className="flex items-center gap-0.5 text-[11px] font-bold text-foreground shrink-0">
                        <Star className="w-3 h-3 text-warning fill-warning" /> {store.rating}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-primary font-semibold mt-0.5">{store.category}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="flex items-center gap-1 text-[10px] font-bold text-accent-foreground bg-accent rounded-full px-2 py-0.5">
                      <Clock className="w-3 h-3" /> {store._km != null ? etaFromKm(store._km) : store.delivery_time}
                    </span>
                    {store.minimum_order > 0 && (
                      <span className="text-[10px] font-semibold text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                        {t("grocery.min")} Rs {store.minimum_order}
                      </span>
                    )}
                    {store._km != null && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                        <MapPin className="w-3 h-3" /> <bdi>{store._km.toFixed(1)} km</bdi>
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground self-center shrink-0 rtl:rotate-180" />
              </Button>
            ))}
          </div>
        )}
      </div>

      </>
      )}
      <Dialog open={rationOpen} onOpenChange={setRationOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{L("Choose a shop for your ration list", "راشن پرچی کے لیے دکان منتخب کریں")}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {reachableAll.filter(s => s.is_active).map(s => <Button key={s.id} variant="outline" className="h-auto min-h-12 w-full justify-between gap-2 whitespace-normal text-start" onClick={() => navigate(`/grocery/${s.id}?tab=orders`)}><span dir="auto" className="min-w-0 break-words">{s.name}</span><ChevronRight className="size-4 shrink-0 rtl:rotate-180" /></Button>)}
            {!reachableAll.some(s => s.is_active) && <p className="text-sm text-muted-foreground">{L("No open shop available at this location.", "اس مقام پر ابھی کوئی کھلی دکان دستیاب نہیں۔")}</p>}
          </div>
        </DialogContent>
      </Dialog>
      <BottomTabBar />
    </div>
  );
};


export default Grocery;
