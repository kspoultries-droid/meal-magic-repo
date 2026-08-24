import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Store, Star, Truck, MapPin, Package, Zap, Flame, ChevronRight } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import BottomTabBar from "@/components/BottomTabBar";
import CartDrawer from "@/components/CartDrawer";
import AppShareButton from "@/components/AppShareButton";
import BazarDeals from "@/components/wholesale/BazarDeals";
import BazarHero from "@/components/wholesale/BazarHero";
import BazarProductCard, { BazarProduct } from "@/components/wholesale/BazarProductCard";
import { StoreGridSkeleton } from "@/components/ui/skeleton-card";

const PAGE_SIZE = 60;

const Wholesale = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [stores, setStores] = useState<any[]>([]);
  const [products, setProducts] = useState<BazarProduct[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [shopCategories, setShopCategories] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeShopCategory, setActiveShopCategory] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(20);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from("cities").select("id, name").then(({ data }) => setCities(data || []));
    (supabase.from("wholesale_categories" as any).select("*").eq("is_active", true).order("sort_order") as any).then(({ data }: any) => {
      const all = data || [];
      setCategories(all.filter((c: any) => (c.kind ?? "item") === "item"));
      setShopCategories(all.filter((c: any) => c.kind === "shop"));
    });
  }, []);

  const fetchProductPage = async (list: any[], from: number) => {
    const ids = list.map((s: any) => s.id);
    if (ids.length === 0) return [] as any[];
    let pq: any = supabase
      .from("grocery_products")
      .select("id, store_id, name, price, discount_price, wholesale_price, image_url, unit, min_order_qty, is_available")
      .in("store_id", ids)
      .eq("is_available", true)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (searchQuery) pq = pq.ilike("name", `%${searchQuery}%`);
    const { data } = await pq;
    const nameById = new Map(list.map((s: any) => [s.id, s.name]));
    return (data || []).map((p: any) => ({ ...p, storeName: nameById.get(p.store_id) }));
  };

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setVisible(20);
      let query: any = supabase
        .from("grocery_stores")
        .select("*")
        .eq("store_type", "wholesale")
        .neq("subscription_status", "paused");
      if (selectedCity) query = query.eq("city_id", selectedCity);
      if (activeCategory && activeCategory !== "All") query = query.eq("category", activeCategory);
      if (activeShopCategory) query = query.eq("shop_category", activeShopCategory);
      query = query.order("sort_order").order("created_at", { ascending: false });

      const { data: storeData } = await query;
      const list = storeData || [];
      setStores(list);

      const page = await fetchProductPage(list, 0);
      setProducts(page);
      setHasMore(page.length === PAGE_SIZE);
      setLoading(false);
    };
    fetchAll();
  }, [searchQuery, selectedCity, activeCategory, activeShopCategory]);

  const loadMore = async () => {
    if (visible + 20 <= products.length) {
      setVisible((v) => v + 20);
      return;
    }
    if (!hasMore || loadingMore) {
      setVisible((v) => Math.min(v + 20, products.length));
      return;
    }
    setLoadingMore(true);
    const page = await fetchProductPage(stores, products.length);
    setProducts((prev) => [...prev, ...page]);
    setHasMore(page.length === PAGE_SIZE);
    setVisible((v) => v + 20);
    setLoadingMore(false);
  };

  const filteredStores = useMemo(
    () => (searchQuery ? stores.filter((s) => s.name?.toLowerCase().includes(searchQuery.toLowerCase())) : stores),
    [stores, searchQuery]
  );

  const flashDeals = useMemo(
    () =>
      products
        .filter((p) => (p.wholesale_price ?? p.discount_price ?? p.price) < p.price)
        .sort((a, b) => {
          const da = 1 - (a.wholesale_price ?? a.discount_price ?? a.price) / a.price;
          const db = 1 - (b.wholesale_price ?? b.discount_price ?? b.price) / b.price;
          return db - da;
        })
        .slice(0, 12),
    [products]
  );

  const openProduct = (p: BazarProduct) => navigate(`/bazar/${p.store_id}`);

  const allCats = [...shopCategories, ...categories.filter((c) => c.name !== "All")];

  return (
    <div className="min-h-screen bg-secondary/30 pb-20">
      <Navbar />

      <BazarHero searchQuery={searchQuery} onSearchChange={setSearchQuery} storeCount={filteredStores.length} />

      {/* Category grid — Daraz style */}
      {allCats.length > 0 && (
        <section className="container mx-auto px-4 pt-3">
          <div className="bg-card rounded-2xl border p-3">
            <div className="grid grid-cols-4 gap-2">
              {allCats.slice(0, 8).map((cat: any) => {
                const Icon = (LucideIcons as any)[cat.icon] || Package;
                const isShop = cat.kind === "shop";
                const isActive = isShop ? activeShopCategory === cat.name : activeCategory === cat.name;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      if (isShop) setActiveShopCategory(isActive ? null : cat.name);
                      else setActiveCategory(isActive ? null : cat.name);
                    }}
                    className="flex flex-col items-center gap-1 py-1.5"
                  >
                    <span
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                        isActive ? "bg-primary text-primary-foreground shadow-md scale-105" : "bg-secondary text-primary"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </span>
                    <span className="text-[9px] font-semibold text-foreground text-center leading-tight line-clamp-2">
                      {cat.name_ur || cat.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {allCats.length > 8 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide mt-2 pt-2 border-t">
                {allCats.slice(8).map((cat: any) => {
                  const isShop = cat.kind === "shop";
                  const isActive = isShop ? activeShopCategory === cat.name : activeCategory === cat.name;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        if (isShop) setActiveShopCategory(isActive ? null : cat.name);
                        else setActiveCategory(isActive ? null : cat.name);
                      }}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold border ${
                        isActive ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground"
                      }`}
                    >
                      {cat.name_ur || cat.name}
                    </button>
                  );
                })}
              </div>
            )}

            {(activeCategory || activeShopCategory) && (
              <button
                onClick={() => { setActiveCategory(null); setActiveShopCategory(null); }}
                className="mt-2 text-[10px] font-bold text-primary"
              >
                فلٹر ہٹائیں / Clear filters
              </button>
            )}
          </div>
        </section>
      )}

      <BazarDeals />

      {/* Flash sale rail */}
      {flashDeals.length > 0 && (
        <section className="pt-1 pb-2">
          <div className="container mx-auto px-4 flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-destructive fill-destructive" />
              <h2 className="text-base font-extrabold text-foreground">فلیش سیل</h2>
              <span className="text-[10px] text-muted-foreground">Flash Sale</span>
            </div>
            <span className="text-[10px] font-bold text-destructive">محدود وقت</span>
          </div>
          <div className="flex gap-2.5 overflow-x-auto scrollbar-hide px-4 pb-1">
            {flashDeals.map((p) => (
              <BazarProductCard key={p.id} product={p} onClick={() => openProduct(p)} compact />
            ))}
          </div>
        </section>
      )}

      {/* Stores rail */}
      <section className="pt-2 pb-1">
        <div className="container mx-auto px-4 flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Store className="w-4 h-4 text-primary" />
            <h2 className="text-base font-extrabold text-foreground">تصدیق شدہ ہول سیلرز</h2>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={selectedCity || ""}
              onChange={(e) => setSelectedCity(e.target.value || null)}
              className="bg-card border rounded-full px-2 py-1 text-[10px] text-foreground outline-none"
            >
              <option value="">تمام شہر</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="container mx-auto px-4"><StoreGridSkeleton count={4} /></div>
        ) : filteredStores.length === 0 ? (
          <div className="container mx-auto px-4">
            <div className="rounded-2xl bg-gradient-to-r from-primary to-primary/80 p-6 text-center">
              <Package className="w-10 h-10 text-primary-foreground mx-auto mb-2" />
              <h3 className="text-lg font-extrabold text-primary-foreground mb-1">جلد آرہا ہے!</h3>
              <p className="text-primary-foreground/90 text-xs">اس فلٹر میں ابھی کوئی ہول سیل دکان موجود نہیں۔</p>
            </div>
          </div>
        ) : (
          <div className="flex gap-2.5 overflow-x-auto scrollbar-hide px-4 pb-1">
            {filteredStores.map((store) => (
              <button
                key={store.id}
                onClick={() => navigate(`/bazar/${store.id}`)}
                className={`shrink-0 w-36 bg-card rounded-2xl border overflow-hidden text-left hover:shadow-md transition-shadow ${
                  !store.is_active ? "opacity-60 grayscale" : ""
                }`}
              >
                <div className="w-full h-20 bg-secondary flex items-center justify-center overflow-hidden relative">
                  {store.image_url ? (
                    <img src={store.image_url} alt={store.name} loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <Store className="w-7 h-7 text-muted-foreground" />
                  )}
                  {store.ships_nationwide && (
                    <span className="absolute top-1.5 right-1.5 bg-background/90 text-primary text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                      <Truck className="w-2.5 h-2.5" /> PK
                    </span>
                  )}
                </div>
                <div className="p-2">
                  <h3 className="font-bold text-foreground text-xs truncate">{store.name}</h3>
                  <div className="flex items-center justify-between mt-0.5">
                    {store.rating > 0 ? (
                      <span className="flex items-center gap-0.5 text-[10px] font-semibold">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" /> {store.rating}
                      </span>
                    ) : <span className="text-[9px] text-muted-foreground truncate">{store.category}</span>}
                    {store.minimum_order > 0 && (
                      <span className="text-[9px] text-destructive font-bold">Min {store.minimum_order}</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Just for you — all products grid */}
      <section className="container mx-auto px-4 pt-4">
        <div className="flex items-center gap-1.5 mb-2.5">
          <Flame className="w-4 h-4 text-destructive" />
          <h2 className="text-base font-extrabold text-foreground">آپ کے لیے</h2>
          <span className="text-[10px] text-muted-foreground">Just For You</span>
        </div>

        {loading ? (
          <StoreGridSkeleton count={6} />
        ) : products.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-6">اس فلٹر میں کوئی پروڈکٹ نہیں ملی</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {products.slice(0, visible).map((p) => (
                <BazarProductCard key={p.id} product={p} onClick={() => openProduct(p)} />
              ))}
            </div>
            {(visible < products.length || hasMore) && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="mx-auto mt-4 flex items-center gap-1 rounded-full bg-card border px-5 py-2 text-xs font-bold text-primary active:scale-95 transition-transform disabled:opacity-60"
              >
                {loadingMore ? "لوڈ ہو رہا ہے…" : "مزید دیکھیں"} <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        )}
      </section>

      <CartDrawer />
      <AppShareButton section="grocery" />
      <BottomTabBar />
    </div>
  );
};

export default Wholesale;
