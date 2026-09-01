import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as LucideIcons from "lucide-react";
import { BadgeCheck, ChevronRight, Flame, MapPin, Package, Search, Star, Store, Truck, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import BottomTabBar from "@/components/BottomTabBar";
import AppShareButton from "@/components/AppShareButton";
import BazarDeals from "@/components/wholesale/BazarDeals";
import BazarHero from "@/components/wholesale/BazarHero";
import BazarFilterBar, { BazarFilters } from "@/components/wholesale/BazarFilterBar";
import BazarProductCard, { BazarProduct } from "@/components/wholesale/BazarProductCard";
import { StoreGridSkeleton } from "@/components/ui/skeleton-card";
import { Button } from "@/components/ui/button";
import useBazarPrefs from "@/hooks/useBazarPrefs";

const PAGE_SIZE = 60;
const defaultFilters: BazarFilters = { sort: "featured", minPrice: "", maxPrice: "", minRating: "", size: "", color: "", discountOnly: false, nationwide: false, wishlistOnly: false };
type StoreRow = { id: string; name: string; image_url: string | null; category: string; rating: number | null; minimum_order: number | null; is_active: boolean | null; ships_nationwide: boolean; city_id: string | null };
const readVariants = (product: BazarProduct & { variants?: unknown }) => !Array.isArray(product.variants) ? [] as { label?: string; name?: string; size?: string; color?: string }[] : product.variants.filter((v): v is { label?: string; name?: string; size?: string; color?: string } => typeof v === "object" && v !== null);

const Wholesale = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [products, setProducts] = useState<(BazarProduct & { variants?: unknown })[]>([]);
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [shopCategories, setShopCategories] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeShopCategory, setActiveShopCategory] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [filters, setFilters] = useState<BazarFilters>(defaultFilters);
  const [grid, setGrid] = useState(true);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(20);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const navigate = useNavigate();
  const { wishlist, recent, toggleWishlist, pushRecent } = useBazarPrefs();

  useEffect(() => {
    supabase.from("cities").select("id, name").then(({ data }) => setCities(data || []));
    (supabase.from("wholesale_categories" as any).select("*").eq("is_active", true).order("sort_order") as any).then(({ data }: any) => { const all = data || []; setCategories(all.filter((c: any) => (c.kind ?? "item") === "item")); setShopCategories(all.filter((c: any) => c.kind === "shop")); });
  }, []);

  const fetchProductPage = async (list: StoreRow[], from: number) => {
    const ids = list.map((s) => s.id); if (!ids.length) return [] as (BazarProduct & { variants?: unknown })[];
    let query: any = supabase.from("grocery_products").select("id, store_id, name, price, discount_price, wholesale_price, image_url, images, unit, min_order_qty, is_available, rating, sold_count, category, variants").in("store_id", ids).eq("is_available", true).order("sort_order", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false }).order("id", { ascending: true }).range(from, from + PAGE_SIZE - 1);
    if (searchQuery.trim()) query = query.ilike("name", `%${searchQuery.trim()}%`);
    const { data, error } = await query; if (error) console.error("Bazar products could not load", error);
    const nameById = new Map(list.map((s) => [s.id, s.name])); return (data || []).map((p: any) => ({ ...p, storeName: nameById.get(p.store_id) }));
  };

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true); setVisible(20);
      let query: any = supabase.from("grocery_stores").select("id, name, image_url, category, rating, minimum_order, is_active, ships_nationwide, city_id").eq("store_type", "wholesale").neq("subscription_status", "paused");
      if (selectedCity) query = query.eq("city_id", selectedCity); if (activeShopCategory) query = query.eq("shop_category", activeShopCategory);
      const { data: storeData, error: storeError } = await query.order("sort_order").order("created_at", { ascending: false }); if (storeError) console.error("Bazar stores could not load", storeError);
      const list = storeData || []; setStores(list); const page = await fetchProductPage(list, 0); setProducts(page); setHasMore(page.length === PAGE_SIZE); setLoading(false);
    }; fetchAll();
  }, [searchQuery, selectedCity, activeCategory, activeShopCategory]);

  const filteredStores = useMemo(() => searchQuery ? stores.filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase())) : stores, [stores, searchQuery]);
  const filteredProducts = useMemo(() => {
    const min = Number(filters.minPrice) || 0; const max = Number(filters.maxPrice) || Number.POSITIVE_INFINITY; const storeById = new Map(stores.map((store) => [store.id, store]));
    return products.filter((p) => { const price = p.wholesale_price ?? p.discount_price ?? p.price; const variants = readVariants(p); const sizes = variants.map((v) => v.size || v.label || v.name || "").filter(Boolean); const colors = variants.map((v) => v.color || "").filter(Boolean); return (!activeCategory || activeCategory === "All" || p.category === activeCategory) && price >= min && price <= max && (!filters.minRating || (p.rating || 0) >= Number(filters.minRating)) && (!filters.discountOnly || price < p.price) && (!filters.nationwide || storeById.get(p.store_id)?.ships_nationwide) && (!filters.wishlistOnly || wishlist.includes(p.id)) && (!filters.size || sizes.some((s) => s.toLowerCase().includes(filters.size.toLowerCase()))) && (!filters.color || colors.some((c) => c.toLowerCase().includes(filters.color.toLowerCase()))); }).sort((a, b) => { const priceA = a.wholesale_price ?? a.discount_price ?? a.price; const priceB = b.wholesale_price ?? b.discount_price ?? b.price; if (filters.sort === "price-low") return priceA - priceB; if (filters.sort === "price-high") return priceB - priceA; if (filters.sort === "rating") return (b.rating || 0) - (a.rating || 0); if (filters.sort === "discount") return (1 - priceB / b.price) - (1 - priceA / a.price); return 0; });
  }, [products, stores, filters, wishlist, activeCategory]);
  const loadMore = async () => { if (visible + 20 <= products.length) { setVisible((v) => v + 20); return; } if (!hasMore || loadingMore) { setVisible((v) => Math.min(v + 20, products.length)); return; } setLoadingMore(true); const page = await fetchProductPage(stores, products.length); setProducts((prev) => [...prev, ...page]); setHasMore(page.length === PAGE_SIZE); setVisible((v) => v + 20); setLoadingMore(false); };
  const openProduct = (p: BazarProduct) => { pushRecent(p.id); navigate(`/product/${p.id}`); };
  const allCats = [...shopCategories, ...categories.filter((c) => c.name !== "All")];
  const variantValues = useMemo(() => { const sizes = new Set<string>(); const colors = new Set<string>(); products.forEach((product) => readVariants(product).forEach((v) => { if (v.size || v.label) sizes.add(v.size || v.label || ""); if (v.color) colors.add(v.color); })); return { sizes: [...sizes].slice(0, 12), colors: [...colors].slice(0, 12) }; }, [products]);
  const recentProducts = recent.map((id) => products.find((p) => p.id === id)).filter((p): p is (BazarProduct & { variants?: unknown }) => Boolean(p)).slice(0, 8);
  const flashDeals = [...products].filter((p) => (p.wholesale_price ?? p.discount_price ?? p.price) < p.price).sort((a, b) => ((b.price - (b.wholesale_price ?? b.discount_price ?? b.price)) / b.price) - ((a.price - (a.wholesale_price ?? a.discount_price ?? a.price)) / a.price)).slice(0, 10);
  const topRanked = [...products].sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0)).slice(0, 10);
  const bestSelling = [...products].sort((a, b) => Number(b.sold_count || 0) - Number(a.sold_count || 0)).slice(0, 10);
  const rail = (items: (BazarProduct & { variants?: unknown })[]) => <div dir="ltr" className="no-scrollbar flex w-full gap-2 overflow-x-auto px-3 pb-1 sm:px-6">{items.map((p) => <div dir="rtl" key={p.id}><BazarProductCard product={p} onClick={() => openProduct(p)} compact isWishlisted={wishlist.includes(p.id)} onToggleWishlist={() => toggleWishlist(p.id)} /></div>)}</div>;

  return <div className="theme-bazar min-h-screen w-full overflow-x-hidden bg-background pb-20"><Navbar /><BazarHero searchQuery={searchQuery} onSearchChange={setSearchQuery} />
    {allCats.length > 0 && <section className="w-full px-3 py-2 sm:px-6"><div dir="ltr" className="no-scrollbar flex w-full gap-1.5 overflow-x-auto pb-1"><div dir="rtl"><Button variant={!activeCategory && !activeShopCategory ? "default" : "outline"} onClick={() => { setActiveCategory(null); setActiveShopCategory(null); }} className="h-8 shrink-0 rounded-lg px-2.5 text-[10px] font-bold">تمام</Button></div>{allCats.map((cat: any) => { const Icon = (LucideIcons as any)[cat.icon] || Package; const isShop = cat.kind === "shop"; const isActive = isShop ? activeShopCategory === cat.name : activeCategory === cat.name; return <div dir="rtl" key={cat.id}><Button variant={isActive ? "default" : "outline"} onClick={() => { if (isShop) { setActiveShopCategory(isActive ? null : cat.name); setActiveCategory(null); } else { setActiveCategory(isActive ? null : cat.name); setActiveShopCategory(null); } }} className="h-8 shrink-0 gap-1 rounded-lg px-2 text-[10px] font-semibold"><span className="grid size-5 place-items-center rounded-md bg-accent"><Icon className="size-3" /></span><span>{cat.name_ur || cat.name}</span></Button></div>; })}</div></section>}
    <BazarDeals />
    {flashDeals.length > 0 && <section className="w-full py-2"><div className="mb-2 flex items-center gap-2 px-3 sm:px-6"><Zap className="size-4 text-destructive" /><h2 className="font-display text-lg font-bold">فلیش سیل</h2><span className="text-xs text-muted-foreground">Flash Sale</span></div>{rail(flashDeals)}</section>}
    {topRanked.length > 0 && <section className="w-full py-2"><div className="mb-2 flex items-center gap-2 px-3 sm:px-6"><Star className="size-4 text-primary" /><h2 className="font-display text-lg font-bold">ٹاپ رینکنگ</h2><span className="text-xs text-muted-foreground">Top Rated</span></div>{rail(topRanked)}</section>}
    {bestSelling.length > 0 && <section className="w-full py-2"><div className="mb-2 flex items-center gap-2 px-3 sm:px-6"><Flame className="size-4 text-destructive" /><h2 className="font-display text-lg font-bold">سب سے زیادہ فروخت</h2><span className="text-xs text-muted-foreground">Best Selling</span></div>{rail(bestSelling)}</section>}
    <section className="w-full py-3">
      <div className="mb-2 flex items-center justify-between gap-2 px-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2"><Store className="size-4 shrink-0 text-primary" /><h2 className="truncate font-display text-lg font-bold">تصدیق شدہ ہول سیلرز</h2></div>
        <label className="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground"><MapPin className="size-3" /><select value={selectedCity || ""} onChange={(e) => setSelectedCity(e.target.value || null)} className="max-w-[7rem] rounded-md border bg-card px-2 py-1 text-xs text-foreground outline-none"><option value="">تمام شہر</option>{cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      </div>
      {loading ? <div className="px-3 sm:px-6"><StoreGridSkeleton count={4} /></div> : (
        <div className="grid w-full grid-cols-2 gap-2.5 px-3 sm:grid-cols-3 sm:px-6 lg:grid-cols-4">
          {filteredStores.slice(0, 8).map((store) => (
            <button key={store.id} onClick={() => navigate(`/bazar/${store.id}`)} className={`group relative min-w-0 overflow-hidden rounded-2xl border border-border/60 bg-card text-right shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elegant ${!store.is_active ? "opacity-60 grayscale" : ""}`}>
              <div className="relative h-24 w-full overflow-hidden bg-gradient-to-br from-primary/15 via-accent to-secondary sm:h-28">
                {store.image_url ? (
                  <img src={store.image_url} alt={store.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="grid h-full place-items-center"><span className="grid size-12 place-items-center rounded-2xl border border-primary/15 bg-background/80 shadow-sm"><Store className="size-6 text-primary" /></span></div>
                )}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-foreground/30 to-transparent" />
                <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold text-primary-foreground shadow-sm"><BadgeCheck className="size-2.5" /> تصدیق شدہ</span>
                {store.ships_nationwide && <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-[9px] font-bold text-primary shadow-sm"><Truck className="size-2.5" /> ملک بھر میں</span>}
              </div>
              <div className="space-y-1 p-2.5">
                <p className="truncate text-xs font-bold text-card-foreground">{store.name}</p>
                <div className="flex items-center justify-between gap-1 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-0.5 font-semibold text-foreground"><Star className="size-3 fill-primary text-primary" />{store.rating ?? "نیا"}</span>
                  <span className="truncate">{store.category}</span>
                </div>
                {!!store.minimum_order && store.minimum_order > 0 && <p className="truncate text-[9px] text-muted-foreground">کم از کم آرڈر Rs {store.minimum_order.toLocaleString()}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
    {recentProducts.length > 0 && <section className="w-full py-3"><div className="mb-2 flex items-center gap-2 px-3 sm:px-6"><Search className="size-4 text-primary" /><h2 className="font-display text-lg font-bold">حال ہی میں دیکھے گئے</h2><span className="text-xs text-muted-foreground">Recently viewed</span></div>{rail(recentProducts)}</section>}
    <BazarFilterBar filters={filters} onChange={setFilters} resultCount={filteredProducts.length} grid={grid} onGridChange={setGrid} sizes={variantValues.sizes} colors={variantValues.colors} />
    <section className="w-full px-3 pt-5 sm:px-6"><div className="mb-3 flex items-center gap-2"><Flame className="size-4 text-destructive" /><h2 className="font-display text-xl font-bold">آپ کے لیے منتخب</h2><span className="text-xs text-muted-foreground">Just For You</span></div>{loading ? <StoreGridSkeleton count={6} /> : filteredProducts.length === 0 ? <div className="rounded-xl border bg-card py-12 text-center"><Package className="mx-auto mb-2 size-8 text-muted-foreground" /><p className="text-sm font-semibold">اس فلٹر میں کوئی پروڈکٹ نہیں ملی</p><p className="mt-1 text-xs text-muted-foreground">فلٹرز تبدیل کر کے دوبارہ کوشش کریں</p></div> : <><div className={grid ? "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" : "space-y-2"}>{filteredProducts.slice(0, visible).map((p) => <BazarProductCard key={p.id} product={p} list={!grid} onClick={() => openProduct(p)} isWishlisted={wishlist.includes(p.id)} onToggleWishlist={() => toggleWishlist(p.id)} />)}</div>{(visible < filteredProducts.length || hasMore) && <Button variant="outline" onClick={loadMore} disabled={loadingMore} className="mx-auto mt-5 flex">{loadingMore ? "لوڈ ہو رہا ہے…" : "مزید دیکھیں"}<ChevronRight className="size-4" /></Button>}</>}</section>
    <AppShareButton section="grocery" /><BottomTabBar />
  </div>;
};
export default Wholesale;
