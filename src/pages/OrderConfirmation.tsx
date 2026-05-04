import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { CheckCircle2, Package, Clock, MapPin, Phone, Home, Receipt, ChevronRight, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const OrderConfirmation = () => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const isGrocery = type === "grocery";
  const trackingPath = isGrocery ? `/profile` : `/order-tracking/${id}`;

  useEffect(() => {
    const fetch = async () => {
      if (!id) return;
      const table = isGrocery ? "grocery_cart_orders" : "orders";
      const { data } = await supabase.from(table).select("*").eq("id", id).maybeSingle();
      setOrder(data);
      setLoading(false);
    };
    fetch();
  }, [id, isGrocery]);

  const shortId = id?.slice(0, 8).toUpperCase();

  const copyId = () => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    toast.success("آرڈر ID کاپی ہو گیا");
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">لوڈ ہو رہا ہے...</div>;
  }

  return (
    <div className="min-h-screen bg-background pb-10">
      {/* Hero */}
      <div className="bg-gradient-hero text-primary-foreground px-4 pt-10 pb-12 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,white,transparent_70%)]" />
        <div className="relative animate-scale-in">
          <div className="w-20 h-20 mx-auto bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-3 shadow-glow">
            <CheckCircle2 className="w-12 h-12" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-extrabold mb-1">آرڈر کامیابی سے دیا گیا!</h1>
          <p className="text-sm opacity-90">Order placed successfully 🎉</p>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-6 max-w-md space-y-4">
        {/* Order ID Card */}
        <div className="glass rounded-2xl p-4 shadow-card animate-slide-up">
          <p className="text-[11px] text-muted-foreground mb-1">آرڈر نمبر / Order #</p>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xl font-extrabold font-mono text-primary">#{shortId}</span>
            <button onClick={copyId} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
              <Copy className="w-3.5 h-3.5" /> Copy
            </button>
          </div>
        </div>

        {/* Summary */}
        {order && (
          <div className="bg-card border rounded-2xl p-4 shadow-card animate-slide-up">
            <h2 className="text-sm font-bold mb-3 flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-primary" /> آرڈر کا خلاصہ
            </h2>

            {isGrocery && Array.isArray(order.items) && (
              <div className="space-y-1.5 mb-3 pb-3 border-b">
                {order.items.map((it: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-foreground">{it.name} × {it.quantity}</span>
                    <span className="font-semibold">Rs {it.price * it.quantity}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-extrabold text-primary text-base">Rs {order.total_amount}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Payment</span><span className="font-semibold uppercase">{order.payment_method || "COD"}</span></div>
              {order.delivery_address && (
                <div className="flex gap-1.5 pt-1">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{order.delivery_address}</span>
                </div>
              )}
              {order.is_gift && order.receiver_name && (
                <div className="flex gap-1.5"><Phone className="w-3.5 h-3.5 text-muted-foreground" /> <span>{order.receiver_name} — {order.receiver_phone}</span></div>
              )}
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div className="bg-card border rounded-2xl p-4 shadow-card animate-slide-up">
          <h2 className="text-sm font-bold mb-3 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-primary" /> اگلے اسٹیپس / What's next?
          </h2>
          <ol className="space-y-2.5">
            {[
              { ur: "دکاندار/ریسٹورنٹ آپ کا آرڈر کنفرم کریں گے", en: "Vendor confirms your order" },
              { ur: "آرڈر تیار کیا جائے گا", en: "Order is being prepared" },
              { ur: "رائیڈر پک اپ کر کے روانہ ہو گا", en: "Rider picks up & dispatches" },
              { ur: "آپ کے دروازے پر ڈلیوری 🚀", en: "Delivered to your door" },
            ].map((s, i) => (
              <li key={i} className="flex gap-3 items-start">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                <div>
                  <p className="text-xs font-semibold text-foreground">{s.ur}</p>
                  <p className="text-[10px] text-muted-foreground">{s.en}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* CTAs */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button variant="outline" onClick={() => navigate("/")} className="rounded-xl">
            <Home className="w-4 h-4 mr-1" /> ہوم
          </Button>
          <Button onClick={() => navigate(trackingPath)} className="rounded-xl bg-gradient-primary shadow-glow">
            <Package className="w-4 h-4 mr-1" /> {isGrocery ? "میرے آرڈرز" : "ٹریک"} <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
