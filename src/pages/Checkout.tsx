import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, MapPin, CreditCard, ShoppingBag } from "lucide-react";
import Navbar from "@/components/Navbar";

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

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    supabase.from("cities").select("*").order("name").then(({ data }) => {
      setCities(data || []);
      if (data?.length) {
        setSelectedCity(data[0].id);
        setDeliveryFee(data[0].delivery_fee || 0);
      }
    });
  }, []);

  useEffect(() => {
    const city = cities.find((c) => c.id === selectedCity);
    setDeliveryFee(city?.delivery_fee || 0);
  }, [selectedCity, cities]);

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

  const placeOrder = async () => {
    if (!address.trim()) { toast.error("ڈلیوری ایڈریس درکار ہے"); return; }
    if (!selectedCity) { toast.error("شہر منتخب کریں"); return; }
    setSubmitting(true);

    try {
      // Find restaurant_id from cart items
      const restaurantName = items[0]?.restaurant;
      const { data: restData } = await supabase.from("restaurants").select("id").eq("name", restaurantName).limit(1).single();

      if (!restData) {
        toast.error("ریسٹورنٹ نہیں ملا");
        setSubmitting(false);
        return;
      }

      // Use server-side RPC to create order with validated prices
      const menuItems = items.map((item) => ({
        menu_item_id: item.id,
        quantity: item.quantity,
      }));

      const { data: orderId, error: orderError } = await supabase.rpc("create_order", {
        _restaurant_id: restData.id,
        _city_id: selectedCity,
        _delivery_address: address,
        _notes: notes || "",
        _payment_method: paymentMethod,
        _menu_items: menuItems,
      });

      if (orderError) throw orderError;

      toast.success("آرڈر کامیابی سے دیا گیا! 🎉");
      clearCart();
      navigate("/profile");
    } catch (error: any) {
      toast.error(error.message || "آرڈر میں مسئلہ آ گیا");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> واپس
        </Button>

        <h1 className="text-2xl font-extrabold text-foreground mb-6">چیک آؤٹ</h1>

        {/* Order Summary */}
        <Card className="mb-4">
          <CardHeader><CardTitle className="text-base">آرڈر کی تفصیل</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>{item.name} × {item.quantity}</span>
                <span className="font-bold">Rs {item.price * item.quantity}</span>
              </div>
            ))}
            <div className="border-t pt-2 flex justify-between text-sm">
              <span className="text-muted-foreground">سب ٹوٹل</span>
              <span>Rs {totalPrice}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">ڈلیوری فیس</span>
              <span>Rs {deliveryFee}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-extrabold text-primary">
              <span>کل</span>
              <span>Rs {totalPrice + deliveryFee}</span>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Info */}
        <Card className="mb-4">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="w-4 h-4" /> ڈلیوری کی معلومات</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <select className="w-full border rounded-md p-2.5 bg-background text-foreground" value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)}>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name} (ڈلیوری: Rs {c.delivery_fee})</option>)}
            </select>
            <Input placeholder="مکمل ڈلیوری ایڈریس" value={address} onChange={(e) => setAddress(e.target.value)} required />
            <Input placeholder="کوئی خاص ہدایات (اختیاری)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </CardContent>
        </Card>

        {/* Payment */}
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><CreditCard className="w-4 h-4" /> ادائیگی کا طریقہ</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { value: "cod", label: "کیش آن ڈلیوری (COD)" },
                { value: "jazzcash", label: "JazzCash" },
                { value: "easypaisa", label: "EasyPaisa" },
              ].map((pm) => (
                <label key={pm.value} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${paymentMethod === pm.value ? "border-primary bg-accent" : "hover:bg-secondary"}`}>
                  <input type="radio" name="payment" value={pm.value} checked={paymentMethod === pm.value} onChange={(e) => setPaymentMethod(e.target.value)} className="accent-primary" />
                  <span className="font-medium">{pm.label}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button className="w-full h-12 text-base font-bold" disabled={submitting} onClick={placeOrder}>
          {submitting ? "آرڈر دیا جا رہا ہے..." : `آرڈر دیں — Rs ${totalPrice + deliveryFee}`}
        </Button>
      </div>
    </div>
  );
};

export default Checkout;
