import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Store, Star, Truck, MapPin, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import BottomTabBar from "@/components/BottomTabBar";
import CartDrawer from "@/components/CartDrawer";
import AppShareButton from "@/components/AppShareButton";

const Wholesale = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [stores, setStores] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from("cities").select("id, name").then(({ data }) => setCities(data || []));
  }, []);

  useEffect(() => {
    const fetchStores = async () => {
      setLoading(true);
      let query = supabase
        .from("grocery_stores")
        .select("*")
        .eq("store_type", "wholesale")
        .neq("subscription_status", "paused");
      if (selectedCity) query = query.eq("city_id", selectedCity);
      if (searchQuery) query = query.ilike("name", `%${searchQuery}%`);
      query = query.order("sort_order").order("created_at", { ascending: false });
      const { data } = await query;
      setStores(data || []);
      setLoading(false);
    };
    fetchStores();
  }, [searchQuery, selectedCity]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />

      {/* Hero */}
      <div className="bg-gradient-to-br from-primary to-primary/70 px-4 pt-3 pb-5">
        <div className="text-center text-primary-foreground mb-3">
          <h1 className="text-xl font-extrabold flex items-center justify-center gap-1.5">
            <Package className="w-5 h-5" /> ہول سیل بازار
          </h1>
          <p className="text-xs opacity-90">Wholesale Bazar — کراچی سدر اور پورا پاکستان</p>
        </div>
        <div className="flex items-center gap-3 bg-card rounded-full px-4 py-2.5 shadow">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ہول سیل دکان تلاش کریں / Search wholesale..."
            className="w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-sm"
          />
        </div>
      </div>

      {/* Info Strip */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 px-4 py-2">
        <p className="text-[11px] font-semibold text-yellow-800 dark:text-yellow-300 text-center">
          💡 ہول سیل ریٹ پر سامان • کم از کم مقدار (MOQ) ہر پروڈکٹ پر • کراچی local delivery، باہر TCS/Leopards courier
        </p>
      </div>

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
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-40 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
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
