import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ChevronRight, Package, Bike, CheckCircle2, XCircle, Clock, MapPin, Store } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import BottomTabBar from "@/components/BottomTabBar";
import OrderReviewDialog from "@/components/orders/OrderReviewDialog";
import CustomerGroceryHistory from "@/components/grocery/CustomerGroceryHistory";
import { useCart } from "@/contexts/CartContext";

export const ORDER_TABS = [
  { key: "all", label: "سب", icon: Package },
  { key: "processing", label: "تیاری میں", icon: Clock },
  { key: "onway", label: "راستے میں", icon: Bike },
  { key: "delivered", label: "پہنچ گئے", icon: CheckCircle2 },
  { key: "cancelled", label: "منسوخ", icon: XCircle },
] as const;
export type OrderTab = (typeof ORDER_TABS)[number]["key"];

const ONWAY = ["picked_up", "delivering", "on_the_way", "out_for_delivery"];
export const orderTabOf = (s: string): OrderTab => {
  if (s === "delivered" || s === "completed") return "delivered";
  if (s === "cancelled" || s === "rejected") return "cancelled";
  if (ONWAY.includes(s)) return "onway";
  return "processing";
};

const STATUS_UR: Record<string, string> = {
  pending: "انتظار میں", confirmed: "منظور", preparing: "تیار ہو رہا", ready: "تیار",
  picked_up: "رائیڈر نے اٹھا لیا", delivering: "راستے میں", delivered: "پہنچ گیا",
  completed: "مکمل", cancelled: "منسوخ", rejected: "مسترد",
};
const STEPS = ["pending", "preparing", "delivering", "delivered"];
const stepIndex = (s: string) => {
  const t = orderTabOf(s);
  if (t === "delivered") return 3;
  if (t === "onway") return 2;
  return s === "pending" ? 0 : 1;
};

const MyOrders = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as OrderTab) || "all";
  const { addItems, setIsOpen: setCartOpen } = useCart();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any>(null);
  const [reviewOrder, setReviewOrder] = useState<any>(null);

  useEffect(() => { if (!authLoading && !user) navigate("/auth"); }, [authLoading, user, navigate]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*), restaurants(name, image_url)")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setOrders(data || []);
    setLoading(false);
  };
  useEffect(() => {
    if (!user) return;
    load();
    const ch = supabase.channel("my-orders")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `customer_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    orders.forEach((o) => { const k = orderTabOf(o.status); c[k] = (c[k] || 0) + 1; });
    return c;
  }, [orders]);
  const list = tab === "all" ? orders : orders.filter((o) => orderTabOf(o.status) === tab);

  const reorder = (o: any) => {
    addItems(o.order_items.map((i: any) => {
      const options = Array.isArray(i.options) ? i.options : [];
      return {
        menu_item_id: i.menu_item_id, name: i.name, restaurant: o.restaurants?.name || "",
        price: Number(i.unit_price ?? i.price), quantity: i.quantity, image: i.image || "",
        source: "restaurant" as const, sourceId: o.restaurant_id,
        variant_id: i.variant_id || null, variant_label: i.variant_label || null,
        options, option_ids: options.map((x: any) => x.choice_id).filter(Boolean),
      };
    }));
    setCartOpen(true);
  };

  const badgeVariant = (s: string) => {
    const t = orderTabOf(s);
    return t === "delivered" ? "bg-success text-success-foreground" : t === "cancelled" ? "bg-destructive text-destructive-foreground" : t === "onway" ? "bg-primary text-primary-foreground" : "bg-warning text-warning-foreground";
  };

  return (
    <div className="min-h-screen bg-secondary/40 pb-24" dir="rtl">
      <div className="sticky top-0 z-40 bg-card border-b shadow-soft">
        <div className="h-14 px-3 flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-secondary" aria-label="واپس">
            <ArrowLeft className="w-5 h-5 rotate-180" />
          </button>
          <h1 className="text-lg font-extrabold">میرے آرڈرز</h1>
        </div>
        <div className="flex overflow-x-auto no-scrollbar px-2">
          {ORDER_TABS.map((t) => (
            <button key={t.key} onClick={() => setParams({ tab: t.key }, { replace: true })}
              className={`shrink-0 px-3 py-2.5 text-sm font-bold border-b-2 transition-colors ${tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
              {t.label}{counts[t.key] ? ` (${counts[t.key]})` : ""}
            </button>
          ))}
        </div>
      </div>

      <div className="p-3 space-y-3">
        {loading ? (
          <p className="text-center text-muted-foreground py-10">لوڈ ہو رہا ہے…</p>
        ) : list.length === 0 ? (
          <div className="bg-card rounded-2xl border p-8 text-center space-y-3">
            <Package className="w-10 h-10 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">اس حصے میں کوئی آرڈر نہیں</p>
            <Button size="sm" onClick={() => navigate("/")}>خریداری شروع کریں</Button>
          </div>
        ) : list.map((o) => {
          const first = o.order_items?.[0];
          const more = (o.order_items?.length || 0) - 1;
          return (
            <button key={o.id} onClick={() => setDetail(o)} className="w-full text-right bg-card rounded-2xl border shadow-card overflow-hidden active:scale-[0.99] transition-transform">
              <div className="flex items-center justify-between px-4 py-2.5 border-b bg-secondary/30">
                <span className="flex items-center gap-1.5 text-sm font-bold min-w-0">
                  <Store className="w-4 h-4 text-primary shrink-0" />
                  <span className="truncate">{o.restaurants?.name || "ریسٹورنٹ"}</span>
                </span>
                <Badge className={badgeVariant(o.status)}>{STATUS_UR[o.status] || o.status}</Badge>
              </div>
              <div className="flex gap-3 p-4">
                <div className="w-16 h-16 rounded-xl bg-secondary overflow-hidden shrink-0">
                  {(first?.image || o.restaurants?.image_url) ? <img src={first?.image || o.restaurants?.image_url} alt="" className="w-full h-full object-cover" loading="lazy" /> : <Package className="w-6 h-6 m-5 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{first?.name || "آرڈر"} {first ? `× ${first.quantity}` : ""}</p>
                  {more > 0 && <p className="text-xs text-muted-foreground">+{more} مزید چیزیں</p>}
                  <p className="text-xs text-muted-foreground mt-1">{new Date(o.created_at).toLocaleDateString("en-GB")} · #{o.id.slice(0, 8)}</p>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <span className="font-extrabold text-primary">Rs {Number(o.total_amount).toLocaleString("en-US")}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground rotate-180" />
                </div>
              </div>
            </button>
          );
        })}

        {(tab === "all") && <div className="pt-2"><CustomerGroceryHistory /></div>}
      </div>

      <Sheet open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-3xl" dir="rtl">
          {detail && (() => {
            const idx = stepIndex(detail.status);
            const cancelled = orderTabOf(detail.status) === "cancelled";
            const fee = Number(detail.delivery_fee || 0);
            const disc = Number(detail.discount_amount || 0);
            const total = Number(detail.total_amount || 0);
            return (
              <div className="space-y-4">
                <SheetHeader><SheetTitle className="text-right">آرڈر کی تفصیل</SheetTitle></SheetHeader>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>#{detail.id.slice(0, 8)}</span>
                  <span>{new Date(detail.created_at).toLocaleString("en-GB")}</span>
                </div>

                {cancelled ? (
                  <div className="rounded-xl bg-destructive/10 text-destructive p-3 text-sm font-bold text-center">یہ آرڈر منسوخ ہو گیا</div>
                ) : (
                  <div className="flex items-start justify-between">
                    {STEPS.map((s, i) => (
                      <div key={s} className="flex-1 flex flex-col items-center gap-1">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i <= idx ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{i + 1}</div>
                        <span className={`text-[10px] text-center ${i <= idx ? "text-foreground font-bold" : "text-muted-foreground"}`}>{["آرڈر ملا", "تیاری", "راستے میں", "پہنچ گیا"][i]}</span>
                      </div>
                    ))}
                  </div>
                )}

                {detail.delivery_address && (
                  <div className="flex gap-2 rounded-xl border p-3 text-sm">
                    <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>{detail.delivery_address}</span>
                  </div>
                )}

                <div className="rounded-xl border divide-y">
                  <div className="px-3 py-2 text-sm font-bold flex items-center gap-1.5"><Store className="w-4 h-4 text-primary" />{detail.restaurants?.name}</div>
                  {(detail.order_items || []).map((it: any) => (
                    <div key={it.id} className="flex justify-between px-3 py-2 text-sm">
                      <span>{it.name}{it.variant_label ? ` (${it.variant_label})` : ""} × {it.quantity}</span>
                      <span className="font-semibold">Rs {Number(it.price) * it.quantity}</span>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl bg-secondary/40 p-3 space-y-1 text-sm">
                  <div className="flex justify-between"><span>کھانا</span><span>Rs {total - fee + disc}</span></div>
                  <div className="flex justify-between"><span>ڈیلیوری</span><span>Rs {fee}</span></div>
                  {disc > 0 && <div className="flex justify-between text-success"><span>رعایت</span><span>- Rs {disc}</span></div>}
                  <div className="flex justify-between font-extrabold text-base border-t pt-1"><span>کل</span><span className="text-primary">Rs {total}</span></div>
                  <p className="text-[11px] text-muted-foreground">ادائیگی: {detail.payment_method === "cod" || !detail.payment_method ? "نقد (ڈیلیوری پر)" : detail.payment_method}</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {!cancelled && orderTabOf(detail.status) !== "delivered" && (
                    <Button className="col-span-2" onClick={() => navigate(`/order-tracking/${detail.id}`)}>آرڈر ٹریک کریں 📍</Button>
                  )}
                  {orderTabOf(detail.status) === "delivered" && (
                    <Button variant="outline" onClick={() => { setReviewOrder(detail); setDetail(null); }}>ریویو دیں ⭐</Button>
                  )}
                  {detail.order_items?.length > 0 && (
                    <Button variant={orderTabOf(detail.status) === "delivered" ? "default" : "outline"} className={orderTabOf(detail.status) === "delivered" ? "" : "col-span-2"} onClick={() => { reorder(detail); setDetail(null); }}>🔁 دوبارہ آرڈر</Button>
                  )}
                </div>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>

      {reviewOrder && user && (
        <OrderReviewDialog
          open={!!reviewOrder}
          onOpenChange={(v) => !v && setReviewOrder(null)}
          orderId={reviewOrder.id}
          restaurantId={reviewOrder.restaurant_id}
          customerId={user.id}
          kind="food"
          riderId={reviewOrder.rider_id}
          items={(reviewOrder.order_items || []).map((i: any) => ({ name: i.name, quantity: i.quantity }))}
        />
      )}
      <BottomTabBar />
    </div>
  );
};

export default MyOrders;
