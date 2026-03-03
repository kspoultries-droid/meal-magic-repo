import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileImage, Check, X, Clock, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";

interface ShopkeeperListOrdersProps {
  storeId: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "نئی / New", color: "bg-yellow-100 text-yellow-800" },
  quoted: { label: "قیمت بتائی / Quoted", color: "bg-blue-100 text-blue-800" },
  confirmed: { label: "تصدیق شدہ / Confirmed", color: "bg-primary/20 text-primary" },
  delivering: { label: "ڈلیوری / Delivering", color: "bg-orange-100 text-orange-800" },
  completed: { label: "مکمل / Done", color: "bg-green-100 text-green-800" },
  cancelled: { label: "منسوخ / Cancelled", color: "bg-destructive/20 text-destructive" },
};

const ShopkeeperListOrders = ({ storeId }: ShopkeeperListOrdersProps) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [quoteAmount, setQuoteAmount] = useState("");
  const [shopNotes, setShopNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("grocery_list_orders")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, [storeId]);

  const updateOrder = async (orderId: string, updates: any) => {
    setUpdating(true);
    const { error } = await supabase.from("grocery_list_orders").update(updates).eq("id", orderId);
    if (error) toast.error(error.message);
    else { toast.success("اپڈیٹ ہو گیا / Updated"); fetchOrders(); setSelectedOrder(null); }
    setUpdating(false);
  };

  const pendingCount = orders.filter(o => o.status === "pending").length;

  if (loading) return null;
  if (orders.length === 0) return null;

  return (
    <div className="bg-card rounded-2xl border p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <FileImage className="w-5 h-5 text-primary" />
          📋 فوٹو آرڈرز / Photo List Orders
        </h3>
        {pendingCount > 0 && (
          <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
            {pendingCount} نئے
          </span>
        )}
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {orders.map((order) => {
          const status = STATUS_MAP[order.status] || STATUS_MAP.pending;
          return (
            <button
              key={order.id}
              onClick={() => { setSelectedOrder(order); setQuoteAmount(String(order.total_amount || "")); setShopNotes(order.shopkeeper_notes || ""); }}
              className="w-full flex items-center gap-3 p-3 bg-secondary rounded-xl text-left hover:bg-accent transition-colors"
            >
              <img src={order.image_url} alt="List" className="w-14 h-14 rounded-lg object-cover border" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString("ur-PK")}
                  </span>
                </div>
                {order.delivery_address && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {order.delivery_address}
                  </p>
                )}
                {order.total_amount > 0 && (
                  <p className="text-sm font-bold text-primary">Rs {order.total_amount}</p>
                )}
              </div>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </button>
          );
        })}
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(v) => !v && setSelectedOrder(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>📋 آرڈر تفصیل / Order Detail</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <img src={selectedOrder.image_url} alt="Ration list" className="w-full rounded-xl border max-h-64 object-contain bg-secondary" />

              {selectedOrder.notes && (
                <p className="text-sm bg-accent/50 p-2 rounded-lg"><strong>نوٹ:</strong> {selectedOrder.notes}</p>
              )}
              <p className="text-sm flex items-center gap-1"><MapPin className="w-4 h-4" /> {selectedOrder.delivery_address}</p>

              {selectedOrder.status === "pending" && (
                <div className="space-y-2">
                  <Input type="number" placeholder="کل قیمت / Total Price (Rs)" value={quoteAmount} onChange={(e) => setQuoteAmount(e.target.value)} />
                  <Input placeholder="دکاندار نوٹ / Your notes (optional)" value={shopNotes} onChange={(e) => setShopNotes(e.target.value)} />
                  <div className="flex gap-2">
                    <Button disabled={updating || !quoteAmount} className="flex-1 gap-1" onClick={() => updateOrder(selectedOrder.id, { status: "quoted", total_amount: Number(quoteAmount), shopkeeper_notes: shopNotes || null })}>
                      {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} قیمت بھیجیں / Quote
                    </Button>
                    <Button variant="destructive" disabled={updating} onClick={() => updateOrder(selectedOrder.id, { status: "cancelled" })}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {selectedOrder.status === "confirmed" && (
                <Button className="w-full" disabled={updating} onClick={() => updateOrder(selectedOrder.id, { status: "delivering" })}>
                  ڈلیوری شروع / Start Delivery
                </Button>
              )}

              {selectedOrder.status === "delivering" && (
                <Button className="w-full bg-green-600 hover:bg-green-700" disabled={updating} onClick={() => updateOrder(selectedOrder.id, { status: "completed" })}>
                  مکمل / Complete
                </Button>
              )}

              {(selectedOrder.status === "quoted" || selectedOrder.status === "confirmed") && (
                <p className="text-xs text-center text-muted-foreground">
                  {selectedOrder.status === "quoted" ? "⏳ کسٹمر کی تصدیق کا انتظار / Waiting for customer confirmation" : "✅ کسٹمر نے تصدیق کر دی"}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShopkeeperListOrders;
