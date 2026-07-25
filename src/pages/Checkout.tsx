import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, MapPin, CreditCard, ShoppingBag, LocateFixed, Gift, User, Phone } from "lucide-react";
import Navbar from "@/components/Navbar";
import PromotionalAds from "@/components/PromotionalAds";

const Checkout = () => {
  const { user, loading: authLoading } = useAuth();
  const { items, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [cities, setCities] = useState<any[]>([]);
  const [selectedCity, setSelectedCity] = useState("");
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [restaurantDeliveryMode, setRestaurantDeliveryMode] = useState<string>("platform");

  // Gift / receiver fields
  const [isGift, setIsGift] = useState(false);
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  // Auto-fill address and city from profile
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("address, city_id").eq("id", user.id).single().then(({ data }) => {
      if (data?.address) setAddress(data.address);
      if (data?.city_id) setSelectedCity(data.city_id);
    });
  }, [user]);

  useEffect(() => {
    supabase.from("cities").select("*").order("name").then(({ data }) => {
      setCities(data || []);
      if (data?.length && !selectedCity) {
        setSelectedCity(data[0].id);
        setDeliveryFee(data[0].delivery_fee || 0);
      }
    });
  }, []);

  useEffect(() => {
    const city = cities.find((c) => c.id === selectedCity);
    setDeliveryFee(city?.delivery_fee || 0);
  }, [selectedCity, cities]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("آپ کا براؤزر لوکیشن سپورٹ نہیں کرتا");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        // Reverse geocode using free API
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=ur`);
          const data = await res.json();
          if (data.display_name) {
            setAddress(data.display_name);
            toast.success("لوکیشن مل گئی! 📍");
          }
        } catch {
          setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          toast.success("لوکیشن سیٹ ہو گئی");
        }
        setLocating(false);
      },
      (err) => {
        toast.error("لوکیشن نہیں مل سکی — براؤزر میں اجازت دیں");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <ShoppingBag className="w-16 h-16 mb-4 opacity-30" />
          <p className="text-lg font-bold">کارٹ خالی ہے</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/")}>ریسٹورنٹ دیکھیں</Button>
        </div>
      </div>
    );
  }

  const isGroceryOrder = items.every(i => i.source === "grocery");
  const isRestaurantOrder = items.every(i => (i.source || "restaurant") === "restaurant");
  const isMixed = !isGroceryOrder && !isRestaurantOrder;

  const placeOrder = async () => {
    if (isMixed) { toast.error("کارٹ میں مختلف شاپس کے آئٹمز ہیں — ایک شاپ کا آرڈر الگ سے دیں"); return; }
    if (!address.trim()) { toast.error("ڈلیوری ایڈریس درکار ہے"); return; }
    if (!selectedCity) { toast.error("شہر منتخب کریں"); return; }
    if (isGift && !receiverPhone.trim()) { toast.error("وصول کنندہ کا فون نمبر درکار ہے"); return; }
    setSubmitting(true);

    try {
      if (isGroceryOrder) {
        const storeId = items[0]?.sourceId;
        if (!storeId) { toast.error("اسٹور کی معلومات نہیں ملیں"); setSubmitting(false); return; }
        const orderItems = items.map(item => ({ id: item.id, quantity: item.quantity }));

        const { data: newId, error } = await supabase.rpc("create_grocery_cart_order", {
          _store_id: storeId,
          _city_id: selectedCity,
          _delivery_address: address,
          _notes: notes || null,
          _payment_method: paymentMethod,
          _items: orderItems,
          _receiver_name: isGift ? receiverName : null,
          _receiver_phone: isGift ? receiverPhone : null,
          _is_gift: isGift,
          _delivery_lat: coords?.lat || null,
          _delivery_lng: coords?.lng || null,
        });

        if (error) throw error;
        toast.success("گروسری آرڈر کامیابی سے دیا گیا! 🛒🎉");
        clearCart();
        navigate(`/order-confirmation/grocery/${newId}`);
      } else {
        // Restaurant order — lookup by sourceId first, fallback to name
        let restaurantId = items[0]?.sourceId;
        if (!restaurantId) {
          const restaurantName = items[0]?.restaurant;
          const { data: restData } = await supabase.from("restaurants").select("id").eq("name", restaurantName).limit(1).maybeSingle();
          if (!restData) { toast.error("ریسٹورنٹ نہیں ملا — دوبارہ کارٹ سے آئٹم شامل کریں"); setSubmitting(false); return; }
          restaurantId = restData.id;
        }

        const menuItems = items.map((item) => ({ menu_item_id: item.id, quantity: item.quantity }));

        const { data: orderId, error: orderError } = await supabase.rpc("create_order", {
          _restaurant_id: restaurantId,
          _city_id: selectedCity,
          _delivery_address: address,
          _notes: notes || "",
          _payment_method: paymentMethod,
          _menu_items: menuItems,
          _receiver_name: isGift ? receiverName : null,
          _receiver_phone: isGift ? receiverPhone : null,
          _is_gift: isGift,
          _delivery_lat: coords?.lat || null,
          _delivery_lng: coords?.lng || null,
        });

        if (orderError) throw orderError;
        toast.success("آرڈر کامیابی سے دیا گیا! 🎉");
        clearCart();
        navigate(`/order-confirmation/food/${orderId}`);
      }
    } catch (error: any) {
      toast.error(error.message || "آرڈر میں مسئلہ آ گیا");
    } finally {
      setSubmitting(false);
    }
  };

  const grandTotal = totalPrice + deliveryFee;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-secondary/20 to-background pb-32">
      <Navbar />

      {/* Hero Header */}
      <div className="bg-gradient-hero text-primary-foreground px-4 pt-4 pb-8 shadow-glow relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,white,transparent_60%)]" />
        <div className="container mx-auto max-w-2xl relative">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-primary-foreground/90 hover:text-primary-foreground text-sm mb-3 transition-colors">
            <ArrowLeft className="h-4 w-4" /> واپس
          </button>
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <ShoppingBag className="w-6 h-6" /> چیک آؤٹ
          </h1>
          <p className="text-xs text-primary-foreground/80 mt-1">{items.length} آئٹمز • Rs {grandTotal}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-2xl -mt-5 space-y-4">

        {/* Order Summary - Glass */}
        <div className="glass rounded-2xl p-5 border border-border/50 shadow-elegant animate-fade-in">
          <h2 className="text-sm font-extrabold text-foreground mb-3 flex items-center gap-1.5">
            <span className="w-1 h-4 bg-gradient-primary rounded-full" /> آرڈر کی تفصیل
          </h2>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-foreground/90 truncate pr-2">{item.name} <span className="text-muted-foreground">× {item.quantity}</span></span>
                <span className="font-bold shrink-0">Rs {item.price * item.quantity}</span>
              </div>
            ))}
            <div className="border-t border-dashed pt-2.5 mt-2.5 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">سب ٹوٹل</span>
                <span className="font-semibold">Rs {totalPrice}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">ڈلیوری فیس</span>
                <span className="font-semibold">Rs {deliveryFee}</span>
              </div>
            </div>
            <div className="border-t pt-3 flex justify-between items-baseline">
              <span className="font-extrabold text-foreground">کل قابل ادائیگی</span>
              <span className="text-2xl font-extrabold bg-gradient-primary bg-clip-text text-transparent">Rs {grandTotal}</span>
            </div>
          </div>
        </div>

        {/* Delivery Info - Glass */}
        <div className="glass rounded-2xl p-5 border border-border/50 shadow-card animate-fade-in" style={{ animationDelay: "60ms" }}>
          <h2 className="text-sm font-extrabold text-foreground mb-3 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-glow">
              <MapPin className="w-3.5 h-3.5" />
            </div>
            ڈلیوری کی معلومات
          </h2>
          <div className="space-y-3">
            <select className="w-full border rounded-xl p-3 bg-background/80 text-foreground text-sm" value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)}>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name} (ڈلیوری: Rs {c.delivery_fee})</option>)}
            </select>
            <div className="flex gap-2">
              <Input placeholder="مکمل ڈلیوری ایڈریس" value={address} onChange={(e) => setAddress(e.target.value)} required className="flex-1 h-11 rounded-xl bg-background/80" />
              <Button variant="outline" onClick={getCurrentLocation} disabled={locating} className="shrink-0 h-11 px-3 rounded-xl glass border-primary/30 hover:bg-primary/10">
                <LocateFixed className={`h-4 w-4 text-primary ${locating ? "animate-spin" : ""}`} />
              </Button>
            </div>
            {coords && (
              <p className="text-xs text-primary font-semibold">📍 GPS: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</p>
            )}
            <Input placeholder="کوئی خاص ہدایات (اختیاری)" value={notes} onChange={(e) => setNotes(e.target.value)} className="h-11 rounded-xl bg-background/80" />
          </div>
        </div>

        {/* Gift Delivery - Glass */}
        <div className="glass rounded-2xl p-5 border border-border/50 shadow-card animate-fade-in" style={{ animationDelay: "120ms" }}>
          <h2 className="text-sm font-extrabold text-foreground mb-3 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-pink-500 to-purple-500 text-white flex items-center justify-center shadow-md">
              <Gift className="w-3.5 h-3.5" />
            </div>
            گفٹ ڈلیوری
          </h2>
          <label className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${isGift ? "border-primary bg-primary/10 shadow-glow" : "border-border hover:border-primary/30"}`}>
            <input type="checkbox" checked={isGift} onChange={(e) => setIsGift(e.target.checked)} className="accent-primary w-4 h-4" />
            <span className="font-semibold text-sm">کسی اور کو ڈلیور کریں 🎁</span>
          </label>
          {isGift && (
            <div className="space-y-3 mt-3 animate-fade-in">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground shrink-0" />
                <Input placeholder="وصول کنندہ کا نام" value={receiverName} onChange={(e) => setReceiverName(e.target.value)} className="h-11 rounded-xl bg-background/80" />
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                <Input placeholder="وصول کنندہ کا فون نمبر *" value={receiverPhone} onChange={(e) => setReceiverPhone(e.target.value)} required className="h-11 rounded-xl bg-background/80" />
              </div>
            </div>
          )}
        </div>

        {/* Payment - Glass */}
        <div className="glass rounded-2xl p-5 border border-border/50 shadow-card animate-fade-in" style={{ animationDelay: "180ms" }}>
          <h2 className="text-sm font-extrabold text-foreground mb-3 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-glow">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
            ادائیگی کا طریقہ
          </h2>
          <div className="grid gap-2">
            {[
              { value: "cod", label: "کیش آن ڈلیوری", icon: "💵" },
              { value: "jazzcash", label: "JazzCash", icon: "📱" },
              { value: "easypaisa", label: "EasyPaisa", icon: "💚" },
            ].map((pm) => (
              <label key={pm.value} className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${paymentMethod === pm.value ? "border-primary bg-primary/10 shadow-glow" : "border-border hover:border-primary/30"}`}>
                <input type="radio" name="payment" value={pm.value} checked={paymentMethod === pm.value} onChange={(e) => setPaymentMethod(e.target.value)} className="accent-primary" />
                <span className="text-lg">{pm.icon}</span>
                <span className="font-semibold text-sm">{pm.label}</span>
              </label>
            ))}
          </div>
        </div>

        <PromotionalAds placement="checkout" className="!px-0" />
      </div>

      {/* Sticky Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-border/50 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)] shadow-elegant">
        <div className="container mx-auto max-w-2xl flex items-center gap-3">
          <div className="flex-1">
            <p className="text-[10px] text-muted-foreground">کل قابل ادائیگی</p>
            <p className="text-lg font-extrabold bg-gradient-primary bg-clip-text text-transparent leading-tight">Rs {grandTotal}</p>
          </div>
          <Button className="flex-[2] h-12 text-base font-extrabold bg-gradient-primary shadow-glow hover:shadow-elegant hover:scale-[1.02] transition-all" disabled={submitting} onClick={placeOrder}>
            {submitting ? "بھیجا جا رہا ہے..." : "آرڈر کی تصدیق کریں ✓"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
