import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { ArrowLeft, Plus, Minus, ShoppingBasket, Star, Clock, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import CartDrawer from "@/components/CartDrawer";
import BottomTabBar from "@/components/BottomTabBar";

const GroceryStoreDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { items: cartItems, addItem, updateQuantity } = useCart();
  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [{ data: storeData }, { data: productsData }] = await Promise.all([
        supabase.from("grocery_stores").select("*").eq("id", id).single(),
        supabase.from("grocery_products").select("*").eq("store_id", id).eq("is_available", true).order("category"),
      ]);
      setStore(storeData);
      setProducts(productsData || []);
      setLoading(false);
    };
    if (id) fetchData();
  }, [id]);

  const categories = ["All", "🔥 Special Offers", ...Array.from(new Set(products.map((p) => p.category || "General")))];
  const filtered = activeCategory === "All" ? products : activeCategory === "🔥 Special Offers" ? products.filter((p) => p.is_special_offer) : products.filter((p) => p.category === activeCategory);

  const getCartQty = (productId: string) => {
    const item = cartItems.find((i) => i.id === productId);
    return item?.quantity || 0;
  };

  const handleAdd = (product: any) => {
    const effectivePrice = product.discount_price || product.price;
    addItem({
      id: product.id,
      name: product.name,
      restaurant: store?.name || "Grocery",
      price: effectivePrice,
      image: product.image_url || "",
    });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">لوڈ ہو رہا ہے...</div>;
  if (!store) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">اسٹور نہیں ملا</div>;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Store Header */}
      <div className="relative bg-primary pb-6">
        <div className="absolute top-4 left-4 z-10">
          <Button variant="ghost" size="icon" className="bg-card/80 backdrop-blur" onClick={() => navigate("/grocery")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>
        {store.image_url ? (
          <img src={store.image_url} alt={store.name} className="w-full h-48 object-cover" />
        ) : (
          <div className="w-full h-48 bg-primary flex items-center justify-center">
            <ShoppingBasket className="w-20 h-20 text-primary-foreground/30" />
          </div>
        )}
        <div className="px-4 -mt-6 relative z-10">
          <div className="bg-card rounded-2xl p-4 shadow-lg border">
            <h1 className="text-xl font-extrabold text-foreground">{store.name}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Star className="w-4 h-4 text-yellow-500" /> {store.rating || "New"}</span>
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {store.delivery_time}</span>
              <span className="text-primary font-semibold">{store.category}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Chips */}
      <div className="px-4 py-4 overflow-x-auto">
        <div className="flex gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
                activeCategory === cat ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="container mx-auto px-4 pb-6">
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">اس کیٹیگری میں کوئی پروڈکٹ نہیں</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((product) => {
              const qty = getCartQty(product.id);
              return (
                <div key={product.id} className="bg-card rounded-2xl border overflow-hidden relative">
                  {product.is_special_offer && (
                    <div className="absolute top-2 left-2 z-10 bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                      <Percent className="w-3 h-3" /> آفر / Offer
                    </div>
                  )}
                  <div className="h-28 bg-secondary flex items-center justify-center overflow-hidden">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <ShoppingBasket className="w-10 h-10 text-muted-foreground/30" />
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-bold text-foreground truncate">{product.name}</h3>
                    {product.description && <p className="text-xs text-muted-foreground truncate">{product.description}</p>}
                    <div className="flex items-center justify-between mt-2">
                      <div>
                        {product.discount_price ? (
                          <>
                            <span className="text-sm font-extrabold text-destructive">Rs {product.discount_price}</span>
                            <span className="text-xs text-muted-foreground line-through ml-1">Rs {product.price}</span>
                          </>
                        ) : (
                          <span className="text-sm font-extrabold text-primary">Rs {product.price}</span>
                        )}
                        {product.unit && <span className="text-xs text-muted-foreground">/{product.unit}</span>}
                      </div>
                      {qty === 0 ? (
                        <Button size="sm" className="h-8 w-8 p-0 rounded-full" onClick={() => handleAdd(product)}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center" onClick={() => updateQuantity(product.id, qty - 1)}>
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-sm font-bold w-5 text-center">{qty}</span>
                          <button className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center" onClick={() => handleAdd(product)}>
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CartDrawer />
      <BottomTabBar />
    </div>
  );
};

export default GroceryStoreDetail;
