import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Star, Clock, Plus } from "lucide-react";
import Navbar from "@/components/Navbar";
import MenuItemSheet from "@/components/menu/MenuItemSheet";

const RestaurantDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
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
          src={restaurant.image_url || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=400&fit=crop"}
          alt={restaurant.name}
          className="w-full h-full object-cover animate-scale-in"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-10 h-10 rounded-full glass shadow-card flex items-center justify-center hover:scale-105 transition-transform"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div className="absolute bottom-0 left-0 right-0 p-6 animate-slide-up">
          <h1 className="text-3xl font-extrabold text-foreground drop-shadow">{restaurant.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <Badge className="bg-success text-success-foreground gap-1 shadow-glow">
              <Star className="w-3 h-3 fill-current" /> {restaurant.rating || "New"}
            </Badge>
            <span className="flex items-center gap-1 text-sm text-muted-foreground bg-card/70 backdrop-blur px-2 py-0.5 rounded-full">
              <Clock className="w-4 h-4" /> {restaurant.delivery_time || "30-45 min"}
            </span>
          </div>
          {restaurant.cuisines?.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">{restaurant.cuisines.join(" · ")}</p>
          )}
          {restaurant.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{restaurant.description}</p>}
        </div>
      </div>

      {/* Sticky category tabs */}
      {categories.length > 1 && (
        <div className="sticky top-14 z-30 bg-background/95 backdrop-blur border-b border-border/60">
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
      <div className="container mx-auto px-4 py-8">
        {categories.map((cat) => (
          <div key={cat} id={`cat-${cat}`} className="mb-8 scroll-mt-32">
            <h2 className="text-xl font-bold text-foreground mb-4 border-b pb-2">{cat}</h2>
            <div className="grid gap-3">
              {menuItems
                .filter((m) => (m.category || "Main") === cat)
                .map((item) => (
                  <div key={item.id} className="flex items-center gap-4 bg-card rounded-xl p-4 border hover:shadow-md transition-shadow">
                    {item.image_url && (
                      <img src={item.image_url} alt={item.name} className="w-20 h-20 rounded-lg object-cover" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground">{item.name}</h3>
                      {item.description && <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>}
                      {(() => {
                        const vs = (item.variants || []) as any[];
                        const base = vs.find((v) => v.id === "base");
                        const prices = vs.map((v) => Number(v.price) || 0).filter((n) => n > 0);
                        const min = prices.length ? Math.min(item.price > 0 ? item.price : Infinity, ...prices) : item.price;
                        return (
                          <p className="text-primary font-extrabold mt-1">
                            Rs. {min}{vs.length > 1 ? " سے" : ""}
                            {base?.label && <span className="text-xs font-semibold text-muted-foreground"> / {base.label}</span>}
                          </p>
                        );
                      })()}
                    </div>
                    <Button
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
                    </Button>
                  </div>
                ))}
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
