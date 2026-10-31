import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShoppingBasket, MapPin, Loader2, Bike, Phone } from "lucide-react";
import { toast } from "sonner";
import { useNewOrderAlert } from "@/hooks/useNewOrderAlert";
import NewOrderBanner from "@/components/NewOrderBanner";
import GroceryPicking from "@/components/grocery/GroceryPicking";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  storeId: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "نیا آرڈر / New", color: "bg-yellow-100 text-yellow-800" },
  confirmed: { label: "قبول شدہ / Accepted", color: "bg-primary/20 text-primary" },
  preparing: { label: "پکنگ / Picking", color: "bg-blue-100 text-blue-800" },
  picking: { label: "پکنگ / Picking", color: "bg-blue-100 text-blue-800" },
  packed: { label: "پیک شدہ / Packed", color: "bg-indigo-100 text-indigo-800" },
  ready_for_pickup: { label: "پک اپ کے لیے تیار", color: "bg-purple-100 text-purple-800" },
  ready: { label: "تیار ہے / Ready", color: "bg-purple-100 text-purple-800" },
  failed_delivery: { label: "ڈلیوری ناکام", color: "bg-destructive/20 text-destructive" },
  returned_to_store: { label: "دکان کو واپس", color: "bg-destructive/20 text-destructive" },
  delivering: { label: "راستے میں / On the way", color: "bg-orange-100 text-orange-800" },
  out_for_delivery: { label: "راستے میں / On the way", color: "bg-orange-100 text-orange-800" },
  delivered: { label: "ڈلیور / Delivered", color: "bg-green-100 text-green-800" },
  completed: { label: "مکمل / Done", color: "bg-green-100 text-green-800" },
  cancelled: { label: "منسوخ / Cancelled", color: "bg-destructive/20 text-destructive" },
};

const DISPATCH_LABEL: Record<string, string> = {
  none: "ابھی ڈسپیچ نہیں ہوا",
  searching: "🏍️ رائیڈر تلاش جاری",
  assigned: "✅ رائیڈر نے قبول کیا",
  stuck: "⚠️ رائیڈر نہیں مل رہا — ایڈمن مدد کرے گا",
};

const ACTIVE = [
  "pending",
  "confirmed",
  "picking",
  "preparing",
  "packed",
  "ready_for_pickup",
  "ready",
  "delivering",
  "out_for_delivery",
  "failed_delivery",
];

const ShopkeeperCartOrders = ({ storeId }: Props) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [updating, setUpdating] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [showChanges, setShowChanges] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const { newOrderCount, triggerAlert, dismissAlert } = useNewOrderAlert();

  const fetchOrders = useCallback(async () => {
    const { data } = await supabase
      .from("grocery_cart_orders")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(40);
    setOrders(data || []);
    setSelected((prev: any) => prev ? (data || []).find(o => o.id === prev.id) || prev : null);
    setLoading(false);
  }, [storeId]);

  useEffect(() => {
    fetchOrders();
    const channel = supabase
      .channel(`shop-cart-orders-${storeId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "grocery_cart_orders", filter: `store_id=eq.${storeId}` },
        (payload) => {
          fetchOrders();
          if (payload.eventType === "INSERT") {
            toast("🛒 نیا آرڈر آیا! / New order received!", { duration: 6000 });
            triggerAlert();
          }
          if (payload.eventType === "UPDATE") {
            const rec: any = payload.new;
            setSelected((prev: any) => (prev?.id === rec.id ? rec : prev));
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId, fetchOrders, triggerAlert]);

  // Re-alert while any order is still un-accepted
  useEffect(() => {
    const timer = setInterval(() => {
      const stale = orders.filter(
        (o) => o.status === "pending" && Date.now() - new Date(o.created_at).getTime() > 3 * 60 * 1000
      );
      if (stale.length > 0) triggerAlert(`${stale.length} آرڈر ابھی تک قبول نہیں کیے گئے!`);
    }, 3 * 60 * 1000);
    return () => clearInterval(timer);
  }, [orders, triggerAlert]);

  const setStatus = async (orderId: string, status: string) => {
    setUpdating(true);
    const { error } = await supabase.rpc("shop_order_action", { _order_id: orderId, _action: status === "confirmed" ? "accept" : "ready" });
    if (error) toast.error(error.message);
    else {
      toast.success("اپڈیٹ ہو گیا / Updated");
      if (status === "ready_for_pickup") toast("🏍️ رائیڈر تلاش شروع — ایپ خود بھیجے گی", { duration: 5000 });
      fetchOrders();
    }
    setUpdating(false);
  };

  const rejectOrder = async (orderId: string) => {
    const reason = rejectReason;
    if (!reason || !reason.trim()) {
      toast.error("وجہ لازمی ہے / Reason is required");
      return;
    }
    setUpdating(true);
    const { error } = await supabase.rpc("shop_order_action", { _order_id: orderId, _action: "cancel", _reason: reason.trim() });
    if (error) toast.error(error.message);
    else {
      toast.success("آرڈر مسترد کر دیا گیا");
      fetchOrders();
      setSelected(null);
      setRejecting(false); setRejectReason("");
    }
    setUpdating(false);
  };

  const active = orders.filter((o) => ACTIVE.includes(o.status));
  const done = orders.filter((o) => !ACTIVE.includes(o.status));
  const pendingCount = orders.filter((o) => o.status === "pending").length;

  if (loading) return null;
  if (orders.length === 0) return null;

  const OrderRow = ({ o }: { o: any }) => {
    const status = STATUS_MAP[o.status] || STATUS_MAP.pending;
    const items = Array.isArray(o.items) ? o.items : [];
    return (
      <Button variant="ghost"
        onClick={() => { setSelected(o); setShowChanges(false); setRejecting(false); }}
        className="h-auto w-full block text-left p-3 bg-secondary rounded-lg hover:bg-accent transition-colors space-y-1"
      >
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
          <span className="text-[10px] text-muted-foreground font-mono">#{o.id.slice(0, 8)}</span>
        </div>
        <p className="text-sm font-bold text-primary">Rs {o.total_amount}</p>
        <p className="text-xs text-muted-foreground truncate">🛍️ {items.length} آئٹمز · {new Date(o.created_at).toLocaleString("ur-PK")}</p>
        {o.delivery_address && (
          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {o.delivery_address}
          </p>
        )}
      </Button>
    );
  };

  const selectedItems = Array.isArray(selected?.items) ? selected.items : [];

  return (
    <div className="bg-card rounded-2xl border overflow-hidden mb-4">
      <NewOrderBanner count={newOrderCount} onDismiss={dismissAlert} label="نیا آرڈر آیا! / New order!" />
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <ShoppingBasket className="w-5 h-5 text-primary" />
            🛒 آئٹم آرڈرز / Item Orders
          </h3>
          {pendingCount > 0 && (
            <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
              {pendingCount} نئے
            </span>
          )}
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto">
          {active.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">کوئی چلتا ہوا آرڈر نہیں</p>
          ) : (
            active.map((o) => <OrderRow key={o.id} o={o} />)
          )}
        </div>

        {done.length > 0 && (
          <div className="border-t pt-2">
            <button
              className="text-xs font-bold text-primary"
              onClick={() => setShowDone((v) => !v)}
            >
              {showDone ? "چھپائیں" : `مکمل / منسوخ آرڈرز (${done.length})`}
            </button>
            {showDone && (
              <div className="space-y-2 mt-2 max-h-60 overflow-y-auto">
                {done.map((o) => <OrderRow key={o.id} o={o} />)}
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>🛒 آرڈر تفصیل / Order Detail</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge className={STATUS_MAP[selected.status]?.color}>{STATUS_MAP[selected.status]?.label || selected.status}</Badge>
                <span className="font-mono text-xs text-muted-foreground">#{selected.id.slice(0, 8)}</span>
              </div>

              <div className="bg-secondary/40 rounded-xl p-3 space-y-1">
                {selectedItems.map((it: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{it.name} × {it.quantity}</span>
                    <span className="font-bold">Rs {Number(it.price) * Number(it.quantity)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-xs"><span>گاہک کی ڈیلیوری فیس</span><span>Rs {selected.delivery_fee_payer === "vendor" ? 0 : selected.delivery_fee}</span></div>
                {selected.delivery_fee_payer === "vendor" && <div className="flex justify-between text-xs text-muted-foreground"><span>دکان کے ذمے ڈیلیوری</span><span>Rs {selected.delivery_fee}</span></div>}
                <div className="flex justify-between text-sm font-extrabold border-t pt-1 mt-1">
                  <span>کل / Total</span>
                  <span className="text-primary">Rs {selected.total_amount}</span>
                </div>
              </div>

              <p className="text-sm flex items-start gap-1"><MapPin className="w-4 h-4 mt-0.5" /> {selected.delivery_address || "پتہ نہیں"}</p>
              {selected.receiver_phone && (
                <p className="text-sm flex items-center gap-1"><Phone className="w-4 h-4" /> {selected.receiver_phone}</p>
              )}
              {selected.notes && (
                <p className="text-sm bg-accent/50 p-2 rounded-lg"><strong>نوٹ:</strong> {selected.notes}</p>
              )}
              <p className="text-xs text-muted-foreground">
                💵 ادائیگی: {selected.payment_method === "cod" ? "کیش آن ڈلیوری (رائیڈر وصول کرے گا)" : selected.payment_method}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Bike className="w-3 h-3" /> {DISPATCH_LABEL[selected.dispatch_state] || selected.dispatch_state}
              </p>

              {selected.final_amount != null && Number(selected.final_amount) !== Number(selected.total_amount) && (
                <p className="text-sm font-extrabold bg-amber-50 text-amber-900 rounded-lg p-2">
                  آخری رقم: Rs {Number(selected.final_amount)} (اصل Rs {Number(selected.total_amount)})
                </p>
              )}

              {["confirmed", "picking", "preparing", "packed"].includes(selected.status) && <Button variant="outline" size="sm" onClick={() => setShowChanges(v => !v)}>اشیا / وزن / متبادل {showChanges ? "چھپائیں" : "دیکھیں"}</Button>}
              {showChanges && ["confirmed", "picking", "preparing", "packed"].includes(selected.status) && (
                <GroceryPicking
                  orderId={selected.id}
                  storeId={storeId}
                  editable={["confirmed", "picking", "preparing"].includes(selected.status)}
                  onChanged={fetchOrders}
                />
              )}

              {selected.status === "pending" && (
                <div className="flex gap-2">
                  <Button className="flex-1" disabled={updating} onClick={() => setStatus(selected.id, "confirmed")}>
                    {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : "قبول کریں / Accept"}
                  </Button>
                  <Button variant="destructive" disabled={updating} onClick={() => setRejecting(true)}>
                    مسترد
                  </Button>
                </div>
              )}

              {rejecting && <div className="space-y-2"><Textarea aria-label="مسترد کرنے کی وجہ" placeholder="مسترد کرنے کی وجہ" value={rejectReason} onChange={e => setRejectReason(e.target.value)} maxLength={500} /><Button variant="destructive" disabled={updating || rejectReason.trim().length < 3} onClick={() => rejectOrder(selected.id)}>وجہ کے ساتھ مسترد</Button></div>}
              {["confirmed", "picking", "preparing", "packed"].includes(selected.status) && (
                <Button className="w-full" disabled={updating} onClick={() => setStatus(selected.id, "ready_for_pickup")}>
                  پیک کرکے تیار / Packed & ready
                </Button>
              )}

              {["ready", "ready_for_pickup"].includes(selected.status) && (
                <p className="text-center text-sm text-muted-foreground bg-secondary p-3 rounded-xl">
                  ⏳ رائیڈر پک اپ کے لیے آ رہا ہے — رقم رائیڈر وصول کرے گا
                </p>
              )}

              {["delivering", "out_for_delivery"].includes(selected.status) && (
                <p className="text-center text-sm text-orange-600 font-bold bg-orange-50 p-3 rounded-xl">🚴 رائیڈر راستے میں ہے</p>
              )}

              {["delivered", "completed"].includes(selected.status) && (
                <p className="text-center text-sm text-green-600 font-bold bg-green-50 p-3 rounded-xl">✅ مکمل ہو گیا</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShopkeeperCartOrders;
