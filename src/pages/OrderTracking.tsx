import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Circle, Clock, ChefHat, Bike, MapPin, Package, Star } from "lucide-react";
import OrderReviewDialog from "@/components/orders/OrderReviewDialog";
import CourierTimeline from "@/components/orders/CourierTimeline";


const orderSteps = [
  { key: "pending", label: "آرڈر موصول ہوا", icon: Package, urdu: "آپ کا آرڈر موصول ہو گیا" },
  { key: "confirmed", label: "تصدیق شدہ", icon: CheckCircle2, urdu: "ریسٹورنٹ نے آرڈر قبول کر لیا" },
  { key: "preparing", label: "تیاری جاری", icon: ChefHat, urdu: "آپ کا کھانا بن رہا ہے" },
  { key: "delivering", label: "ڈلیوری جاری", icon: Bike, urdu: "رائیڈر آپ کے پاس آ رہا ہے" },
  { key: "delivered", label: "مکمل ✅", icon: MapPin, urdu: "آرڈر ڈلیور ہو گیا!" },
];

const OrderTracking = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [kind, setKind] = useState<"food" | "grocery_cart">("food");
  const [rider, setRider] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [hasReview, setHasReview] = useState(false);

  const fetchRider = async (orderId: string) => {
    const { data } = await supabase.rpc("get_order_rider_info", { _order_id: orderId });
    setRider(Array.isArray(data) ? data[0] || null : data);
  };

  const fetchOrder = async () => {
    if (!id) return;
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", id)
      .maybeSingle();
    if (data) {
      setKind("food");
      setOrder(data);
      if (data?.rider_id) await fetchRider(data.id);
    } else {
      const { data: g } = await (supabase as any)
        .from("grocery_cart_orders")
        .select("*, grocery_stores(name)")
        .eq("id", id)
        .maybeSingle();
      setKind("grocery_cart");
      setOrder(g || null);
    }
    setLoading(false);
  };


  useEffect(() => {
    fetchOrder();
  }, [id]);

  // Check existing review
  useEffect(() => {
    if (!id || !user) return;
    supabase.from("order_reviews").select("id").eq("order_id", id).eq("customer_id", user.id).maybeSingle()
      .then(({ data }) => setHasReview(!!data));
  }, [id, user, reviewOpen]);

  // Realtime updates
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`order-track-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` }, () => fetchOrder())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "grocery_cart_orders", filter: `id=eq.${id}` }, () => fetchOrder())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  // Live rider location while delivery is in progress
  useEffect(() => {
    if (!id || !order?.rider_id) return;
    if (["delivered", "completed", "cancelled"].includes(order.status)) return;
    const t = setInterval(() => fetchRider(id), 15000);
    return () => clearInterval(t);
  }, [id, order?.rider_id, order?.status]);


  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">لوڈ ہو رہا ہے...</div>;
  if (!order) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">آرڈر نہیں ملا</div>;

  const normalizedStatus = order.status === "completed" ? "delivered" : order.status;
  const currentStepIndex = orderSteps.findIndex((s) => s.key === normalizedStatus);
  const isCancelled = order.status === "cancelled";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-card border-b px-4 h-14 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-extrabold text-foreground">آرڈر ٹریکنگ</h1>
      </div>

      {/* Map area */}
      <div className="h-64 bg-secondary relative">
        {(order.delivery_lat && order.delivery_lng) ? (
          <iframe
            title="delivery-map"
            className="w-full h-full border-0"
            src={`https://www.google.com/maps?q=${order.delivery_lat},${order.delivery_lng}&hl=ur&z=16&output=embed`}
            loading="lazy"
          />
        ) : order.delivery_address ? (
          <iframe
            title="delivery-map-addr"
            className="w-full h-full border-0"
            src={`https://www.google.com/maps?q=${encodeURIComponent(order.delivery_address)}&hl=ur&z=15&output=embed`}
            loading="lazy"
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <MapPin className="w-12 h-12 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">لوکیشن دستیاب نہیں</p>
            </div>
          </div>
        )}
        {rider?.lat && rider?.lng && (
          <div className="absolute top-2 right-2 bg-card/95 backdrop-blur px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5 text-xs font-bold">
            <Bike className="w-3.5 h-3.5 text-primary animate-bounce" />
            رائیڈر راستے میں
          </div>
        )}
      </div>

      {/* Rider card */}
      {rider && !["delivered", "completed", "cancelled"].includes(order.status) && (
        <div className="mx-4 mt-4 rounded-2xl border bg-card p-4 flex items-center gap-3 shadow-soft">
          <span className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Bike className="w-5 h-5 text-primary" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">آپ کا رائیڈر</p>
            <p className="font-extrabold text-foreground truncate">{rider.rider_name || "رائیڈر"}</p>
          </div>
          {rider.rider_phone && (
            <a href={`tel:${rider.rider_phone}`} className="text-xs font-bold bg-primary text-primary-foreground rounded-full px-3 py-2">
              کال کریں
            </a>
          )}
          {rider.lat && rider.lng && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${rider.lat},${rider.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold border rounded-full px-3 py-2"
            >
              لوکیشن
            </a>
          )}
        </div>
      )}

      {/* Courier shipment — name, tracking number, live timeline + history */}
      {kind === "grocery_cart" && (order.delivery_method === "courier" || order.courier_name || order.tracking_number) && (
        <CourierTimeline
          orderId={order.id}
          courierName={order.courier_name}
          trackingNumber={order.tracking_number}
          trackingUrl={order.courier_tracking_url}
          shipmentStatus={order.shipment_status}
          paymentType={order.courier_payment_type}
        />
      )}

      {/* Order Status Steps */}

      <div className="px-6 py-6">
        <h2 className="text-lg font-extrabold text-foreground mb-6">
          {isCancelled ? "آرڈر منسوخ ہو گیا ❌" : orderSteps[currentStepIndex]?.urdu || "ٹریکنگ"}
        </h2>

        {!isCancelled && (
          <div className="space-y-0">
            {orderSteps.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;
              return (
                <div key={step.key} className="flex items-start gap-4">
                  {/* Line + Circle */}
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      isCompleted ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                    } ${isCurrent ? "ring-4 ring-primary/20" : ""}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    {index < orderSteps.length - 1 && (
                      <div className={`w-0.5 h-10 ${isCompleted && index < currentStepIndex ? "bg-primary" : "bg-border"}`} />
                    )}
                  </div>
                  {/* Label */}
                  <div className="pt-2">
                    <p className={`text-sm font-bold ${isCompleted ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</p>
                    {isCurrent && <p className="text-xs text-primary mt-0.5">{step.urdu}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Order Details */}
      <div className="px-6 pb-8">
        <div className="bg-card rounded-2xl border p-4 space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground font-mono">#{order.id.slice(0, 8)}</p>
            <p className="text-sm font-extrabold text-primary">Rs {order.total_amount}</p>
          </div>
          {order.delivery_address && (
            <p className="text-sm text-muted-foreground">📍 {order.delivery_address}</p>
          )}
          {order.order_items?.map((item: any) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>{item.name} × {item.quantity}</span>
              <span className="font-bold">Rs {item.price * item.quantity}</span>
            </div>
          ))}
        </div>

        {/* Review CTA — only after delivered/completed */}
        {["delivered", "completed"].includes(order.status) && user && order.customer_id === user.id && order.restaurant_id && (
          <Button
            onClick={() => setReviewOpen(true)}
            className="w-full mt-4 h-12 font-extrabold rounded-xl bg-gradient-primary shadow-glow gap-2"
          >
            <Star className="w-4 h-4 fill-yellow-300 text-yellow-300" />
            {hasReview ? "اپنی رائے اپڈیٹ کریں" : "ریسٹورنٹ کو ریٹنگ دیں"}
          </Button>
        )}
      </div>

      {order && user && order.restaurant_id && (
        <OrderReviewDialog
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          orderId={order.id}
          restaurantId={order.restaurant_id}
          customerId={user.id}
          onSubmitted={() => setHasReview(true)}
        />
      )}
    </div>
  );
};

export default OrderTracking;
