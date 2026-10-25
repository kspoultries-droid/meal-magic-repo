import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Star, Clock, Plus, Minus, Check } from "lucide-react";
import Navbar from "@/components/Navbar";
import MenuItemSheet from "@/components/menu/MenuItemSheet";
import restaurantFallback from "@/assets/hero-food.jpg";

const RestaurantDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { items, addItem, updateQuantity } = useCart();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetItem, setSheetItem] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: rest }, { data: menu }] = await Promise.all([
        supabase.from("restaurants").select("*").eq("id", id).single(),
        supabase.from("menu_items").select("*").eq("restaurant_id", id).eq("is_available", true),
      ]);
      setRestaurant(rest);
      setMenuItems(menu || []);
      setLoading(false);
    };
    if (id) fetchData();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="h-56 md:h-72 bg-gradient-to-r from-muted via-muted/60 to-muted animate-pulse" />
      <div className="container mx-auto px-4 py-8 space-y-4">
        {[1,2,3].map(i => (
          <div key={i} className="flex gap-4 bg-card rounded-xl p-4 border">
            <div className="w-20 h-20 rounded-lg bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
              <div className="h-3 w-1/4 rounded bg-muted animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  if (!restaurant) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">ریسٹورنٹ نہیں ملا</div>;

  const categories = [...new Set(menuItems.map((m) => m.category || "Main"))];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <div className="relative h-56 md:h-72 overflow-hidden">
        <img
          src={restaurant.image_url || restaurantFallback}
          alt={restaurant.name}
          className="w-full h-full object-cover"
        />
        <Button variant="secondary" size="icon"
          onClick={() => navigate(-1)}
          className="absolute top-4 start-4 rounded-full bg-card text-card-foreground shadow-card hover:bg-secondary"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </Button>
      </div>
      <section className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-5">
          <h1 className="break-words text-2xl md:text-3xl font-extrabold text-card-foreground">{restaurant.name}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <Badge className="bg-accent text-accent-foreground gap-1">
              <Star className="w-3 h-3 fill-current" /> {restaurant.rating || "New"}
            </Badge>
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" /> {restaurant.delivery_time || "30-45 min"}
            </span>
          </div>
          {restaurant.cuisines?.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">{restaurant.cuisines.join(" · ")}</p>
          )}
          {restaurant.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{restaurant.description}</p>}
        </div>
      </section>

      {/* Sticky category tabs */}
      {categories.length > 1 && (
        <div className="customer-category-tabs sticky z-30 bg-card border-b border-border">
          <div className="container mx-auto px-4">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide py-2">
              {categories.map((cat) => (
                <a
                  key={cat}
                  href={`#cat-${cat}`}
                  className="px-3 py-1.5 rounded-full bg-secondary text-foreground text-xs font-semibold whitespace-nowrap hover:bg-primary hover:text-primary-foreground transition-colors shrink-0"
                >
                  {cat}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Menu */}
      <div className="container mx-auto max-w-5xl px-4 py-6 pb-28">
        {categories.map((cat) => (
          <div key={cat} id={`cat-${cat}`} className="mb-8 scroll-mt-32">
            <h2 className="text-lg font-bold text-foreground mb-3 border-b pb-2">{cat}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {menuItems
                .filter((m) => (m.category || "Main") === cat)
                .map((item) => {
                  const cartLines = items.filter((line) => line.menu_item_id === item.id);
                  const selectedQty = cartLines.reduce((sum, line) => sum + line.quantity, 0);
                  const simpleLine = cartLines.find((line) => !line.variant_id && line.line_type !== "addon");
                  return (
                  <div key={item.id} className={`flex items-center gap-3 rounded-lg p-3 border transition-all ${selectedQty > 0 ? "bg-accent border-primary/40 shadow-card" : "bg-card border-border hover:shadow-card"}`}>
                    {item.image_url && (
                      <img src={item.image_url} alt={item.name} className="w-20 h-20 rounded-lg object-cover" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground">{item.name}</h3>
                      {item.description && <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>}
                      {(() => {
                        const vs = (item.variants || []) as any[];
                        const prices = vs.map((v) => Number(v.price) || 0).filter((n) => n > 0);
                        const min = prices.length ? Math.min(item.price > 0 ? item.price : Infinity, ...prices) : item.price;
                        return (
                          <p className="text-primary font-extrabold mt-1">
                             Rs. {min}{vs.length > 1 ? " سے" : ""}
                          </p>
                        );
                      })()}
                    </div>
                    {selectedQty > 0 && <span className="self-start rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground"><Check className="inline h-3 w-3" /> {selectedQty} منتخب</span>}
                    {(item.variants?.length || item.option_groups?.length) ? <Button
                      size="sm"
                      className="rounded-full h-10 w-10 p-0"
                      onClick={() => {
                        const hasChoices = (item.variants?.length || 0) > 0 || (item.option_groups?.length || 0) > 0;
                        if (hasChoices) {
                          setSheetItem(item);
                        } else {
                          addItem({
                            menu_item_id: item.id,
                            name: item.name,
                            restaurant: restaurant.name,
                            price: item.price,
                            image: item.image_url || restaurant.image_url || "",
                            source: "restaurant",
                            sourceId: restaurant.id,
                          });
                        }
                      }}
                    >
                      <Plus className="w-5 h-5" />
                    </Button> : simpleLine ? (
                      <div className="flex shrink-0 items-center gap-1 rounded-full border border-primary/30 bg-background p-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => updateQuantity(simpleLine.id, simpleLine.quantity - 1)}><Minus className="h-3.5 w-3.5" /></Button>
                        <span className="w-5 text-center text-sm font-extrabold">{simpleLine.quantity}</span>
                        <Button size="icon" className="h-7 w-7 rounded-full" onClick={() => updateQuantity(simpleLine.id, simpleLine.quantity + 1)}><Plus className="h-3.5 w-3.5" /></Button>
                      </div>
                    ) : (
                      <Button size="sm" className="rounded-full h-10 w-10 p-0" onClick={() => addItem({ menu_item_id: item.id, name: item.name, restaurant: restaurant.name, price: item.price, image: item.image_url || restaurant.image_url || "", source: "restaurant", sourceId: restaurant.id })}><Plus className="w-5 h-5" /></Button>
                    )}
                  </div>
                )})}
            </div>
          </div>
        ))}
        {menuItems.length === 0 && (
          <p className="text-center text-muted-foreground py-16">ابھی اس ریسٹورنٹ کا مینو دستیاب نہیں ہے</p>
        )}
      </div>

      <MenuItemSheet
        item={sheetItem}
        restaurant={restaurant ? { id: restaurant.id, name: restaurant.name, image_url: restaurant.image_url } : null}
        onClose={() => setSheetItem(null)}
      />
    </div>
  );
};

export default RestaurantDetail;
