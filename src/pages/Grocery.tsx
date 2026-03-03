import { Search, Apple, Carrot, Milk, Egg, ShoppingBasket, Wheat, Star, Clock, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import BottomTabBar from "@/components/BottomTabBar";
import CartDrawer from "@/components/CartDrawer";

const groceryCategories = [
  { name: "Fruits", icon: Apple, color: "bg-green-100 text-green-600", filter: "Fruits" },
  { name: "Vegetables", icon: Carrot, color: "bg-orange-100 text-orange-600", filter: "Vegetables" },
  { name: "Dairy", icon: Milk, color: "bg-blue-100 text-blue-600", filter: "Dairy" },
  { name: "Eggs & Meat", icon: Egg, color: "bg-yellow-100 text-yellow-600", filter: "Eggs & Meat" },
  { name: "Grocery", icon: ShoppingBasket, color: "bg-primary/10 text-primary", filter: "General" },
  { name: "Atta & Rice", icon: Wheat, color: "bg-amber-100 text-amber-700", filter: "Atta & Rice" },
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
      let query = supabase.from("grocery_stores").select("*").eq("is_active", true);
      if (activeCategory) query = query.eq("category", activeCategory);
      if (searchQuery) query = query.ilike("name", `%${searchQuery}%`);
      const { data } = await query.order("created_at", { ascending: false });
      setStores(data || []);
      setLoading(false);
    };
    fetchStores();
  }, [activeCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      
      {/* Header */}
      <div className="bg-primary pt-4 pb-8 px-4">
        <h1 className="text-2xl font-extrabold text-primary-foreground mb-4">Grocery & Vegetables</h1>
        <div className="flex bg-card rounded-2xl overflow-hidden shadow-lg">
          <div className="flex items-center gap-3 flex-1 px-4 py-3">
            <Search className="w-5 h-5 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for stores..."
              className="w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-sm"
            />
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="container mx-auto px-4 py-6">
        <h2 className="text-xl font-extrabold text-foreground mb-4">Shop by Category</h2>
        <div className="grid grid-cols-3 gap-4">
          {groceryCategories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.filter;
            return (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(isActive ? null : cat.filter)}
                className={`flex flex-col items-center gap-3 p-5 rounded-2xl border transition-shadow ${isActive ? "bg-primary/10 border-primary shadow-md" : "bg-card hover:shadow-md"}`}
              >
                <div className={`w-14 h-14 rounded-2xl ${cat.color} flex items-center justify-center`}>
                  <Icon className="w-7 h-7" />
                </div>
                <span className="text-sm font-bold text-foreground">{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stores List */}
      <div className="container mx-auto px-4 pb-6">
        <h2 className="text-xl font-extrabold text-foreground mb-4">
          {activeCategory ? `${activeCategory} Stores` : "All Stores"}
        </h2>
        {loading ? (
          <p className="text-center text-muted-foreground py-8">لوڈ ہو رہا ہے...</p>
        ) : stores.length === 0 ? (
          <div className="rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 p-6 text-center">
            <ShoppingBasket className="w-12 h-12 text-white mx-auto mb-3" />
            <h3 className="text-xl font-extrabold text-white mb-1">جلد آ رہا ہے!</h3>
            <p className="text-white/80 text-sm">اس کیٹیگری میں ابھی کوئی اسٹور نہیں</p>
          </div>
        ) : (
          <div className="space-y-3">
            {stores.map((store) => (
              <button
                key={store.id}
                onClick={() => navigate(`/grocery/${store.id}`)}
                className="w-full flex items-center gap-4 bg-card rounded-2xl p-4 border hover:shadow-md transition-shadow text-left"
              >
                <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                  {store.image_url ? (
                    <img src={store.image_url} alt={store.name} className="w-full h-full object-cover" />
                  ) : (
                    <ShoppingBasket className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground truncate">{store.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-500" /> {store.rating || "New"}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {store.delivery_time}</span>
                  </div>
                  <span className="text-xs text-primary font-semibold">{store.category}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
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
