import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Star, Clock, Plus, Minus } from "lucide-react";
import Navbar from "@/components/Navbar";
import CartDrawer from "@/components/CartDrawer";

const RestaurantDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">لوڈ ہو رہا ہے...</div>;
  if (!restaurant) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">ریسٹورنٹ نہیں ملا</div>;

  const categories = [...new Set(menuItems.map((m) => m.category || "Main"))];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <CartDrawer />

      {/* Hero */}
      <div className="relative h-56 md:h-72 overflow-hidden">
        <img
          src={restaurant.image_url || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=400&fit=crop"}
          alt={restaurant.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <Button variant="ghost" size="sm" className="mb-2 text-foreground" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> واپس
          </Button>
          <h1 className="text-3xl font-extrabold text-foreground">{restaurant.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <Badge className="bg-success text-success-foreground gap-1">
              <Star className="w-3 h-3 fill-current" /> {restaurant.rating || "New"}
            </Badge>
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" /> {restaurant.delivery_time || "30-45 min"}
            </span>
          </div>
          {restaurant.cuisines?.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">{restaurant.cuisines.join(" · ")}</p>
          )}
          {restaurant.description && <p className="text-sm text-muted-foreground mt-1">{restaurant.description}</p>}
        </div>
      </div>

      {/* Menu */}
      <div className="container mx-auto px-4 py-8">
        {categories.map((cat) => (
          <div key={cat} className="mb-8">
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
                      <p className="text-primary font-extrabold mt-1">Rs. {item.price}</p>
                    </div>
                    <Button
                      size="sm"
                      className="rounded-full h-10 w-10 p-0"
                      onClick={() =>
                        addItem({
                          id: item.id,
                          name: item.name,
                          restaurant: restaurant.name,
                          price: item.price,
                          image: item.image_url || restaurant.image_url || "",
                        })
                      }
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
    </div>
  );
};

export default RestaurantDetail;
