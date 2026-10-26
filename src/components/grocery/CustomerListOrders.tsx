import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, X, FileImage, MapPin, Clock, Receipt, AlertTriangle, PackageCheck } from "lucide-react";
import { toast } from "sonner";

interface CustomerListOrdersProps {
  storeId: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "بھیج دی گئی / Sent", color: "bg-yellow-100 text-yellow-800" },
  quoted: { label: "قیمت آ گئی / Quoted", color: "bg-blue-100 text-blue-800" },
  confirmed: { label: "تصدیق شدہ / Confirmed", color: "bg-primary/20 text-primary" },
  ready_for_pickup: { label: "پک اَپ کے لیے تیار / Ready", color: "bg-primary/10 text-primary" },
  delivered: { label: "پہنچا دیا / Delivered", color: "bg-success/10 text-success" },
  returned_to_store: { label: "واپس / Returned", color: "bg-warning/10 text-warning" },
  delivering: { label: "ڈلیوری / Delivering", color: "bg-orange-100 text-orange-800" },
  completed: { label: "مکمل / Done", color: "bg-green-100 text-green-800" },
  cancelled: { label: "منسوخ / Cancelled", color: "bg-destructive/20 text-destructive" },
};

const CustomerListOrders = ({ storeId }: CustomerListOrdersProps) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const fetchOrders = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("grocery_list_orders")
      .select("*")
      .eq("store_id", storeId)
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    setOrders(data || []);
  };

  useEffect(() => {
    fetchOrders();
    if (!user) return;
    const channel = supabase
      .channel(`customer-list-${storeId}-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'grocery_list_orders',
        filter: `store_id=eq.${storeId}`,
      }, (payload) => {
        const record = (payload.new as any);
        if (record?.customer_id !== user.id) return;
        fetchOrders();
        // Also update selectedOrder if it's the same
        if (payload.eventType === 'UPDATE') {
          setSelectedOrder((prev: any) => prev?.id === record.id ? record : prev);
        }
        if (record.status === 'quoted') {
          toast(`💰 دکاندار نے قیمت بتائی: Rs ${record.total_amount}`, { duration: 6000 });
        } else if (record.status === 'delivering') {
          toast.success("🚴 ڈلیوری شروع ہو گئی! / Delivery started!");
        } else if (record.status === 'completed') {
          toast.success("✅ آرڈر مکمل! / Order completed!");
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, storeId]);

  const respondToQuote = async (orderId: string, accept: boolean) => {
    const { error } = await supabase.from("grocery_list_orders")
      .update({ status: accept ? "confirmed" : "cancelled" })
      .eq("id", orderId);
    if (error) toast.error(error.message);
    else {
      toast.success(accept ? "آرڈر تصدیق ہو گیا! / Order confirmed!" : "آرڈر منسوخ / Order cancelled");
      setSelectedOrder(null);
      fetchOrders();
    }
  };

  const confirmReceived = async (orderId: string) => {
    const { error } = await supabase.from("grocery_list_orders")
      .update({ status: "completed" })
      .eq("id", orderId);
    if (error) toast.error(error.message);
    else {
      toast.success("✅ سامان مل گیا! شکریہ! / Order received! Thank you!");
      setSelectedOrder(null);
      fetchOrders();
    }
  };

  if (orders.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border p-3 mb-3">
      <h3 className="font-bold text-foreground flex items-center gap-2 mb-2 text-sm">
        <FileImage className="w-4 h-4 text-primary" />
        📋 فوٹو آرڈرز ({orders.length})
      </h3>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {orders.map((order) => {
          const status = STATUS_LABELS[order.status] || STATUS_LABELS.pending;
          return (
            <button
              key={order.id}
              onClick={() => setSelectedOrder(order)}
              className="flex flex-col items-center gap-1 p-2 bg-secondary rounded-xl hover:bg-accent transition-colors shrink-0 min-w-[80px]"
            >
              <img src={order.image_url} alt="List" className="w-10 h-10 rounded-lg object-cover border" />
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${status.color} whitespace-nowrap`}>{status.label}</span>
              {order.total_amount > 0 && <span className="text-[10px] font-bold text-primary">Rs {order.total_amount}</span>}
            </button>
          );
        })}
      </div>

      <Dialog open={!!selectedOrder} onOpenChange={(v) => !v && setSelectedOrder(null)}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>📋 آرڈر تفصیل</DialogTitle></DialogHeader>
          {selectedOrder && (
            <div className="space-y-3">
              <img src={selectedOrder.image_url} alt="List" className="w-full rounded-xl border max-h-52 object-contain bg-secondary" />
              <p className="text-sm flex items-center gap-1"><MapPin className="w-4 h-4" /> {selectedOrder.delivery_address}</p>

              {/* Shopkeeper notes */}
              {selectedOrder.shopkeeper_notes && (
                <p className="text-sm bg-accent/50 p-2 rounded-lg"><strong>دکاندار:</strong> {selectedOrder.shopkeeper_notes}</p>
              )}

              {/* Alternatives note */}
              {selectedOrder.alternatives_note && (
                <div className="text-sm bg-orange-50 border border-orange-200 p-3 rounded-xl">
                  <p className="font-bold flex items-center gap-1 text-orange-700 mb-1">
                    <AlertTriangle className="w-4 h-4" /> 🔄 متبادل اشیاء / Alternatives:
                  </p>
                  <p className="text-orange-800">{selectedOrder.alternatives_note}</p>
                </div>
              )}

              {/* Bill Image */}
              {selectedOrder.bill_image_url && (
                <div className="space-y-1">
                  <p className="text-xs font-bold flex items-center gap-1"><Receipt className="w-3 h-3" /> 🧾 بل / Bill:</p>
                  <img src={selectedOrder.bill_image_url} alt="Bill" className="w-full rounded-xl border max-h-48 object-contain bg-secondary" />
                </div>
              )}

              {/* Quoted: Accept/Reject */}
              {selectedOrder.status === "quoted" && (
                <div className="space-y-3">
                  <div className="text-center p-4 bg-primary/10 rounded-xl">
                    <p className="text-sm text-muted-foreground">دکاندار کی بتائی ہوئی قیمت</p>
                    <p className="text-2xl font-extrabold text-primary">Rs {selectedOrder.total_amount}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1 gap-1" onClick={() => respondToQuote(selectedOrder.id, true)}>
                      <Check className="w-4 h-4" /> منظور / Accept
                    </Button>
                    <Button variant="destructive" className="flex-1 gap-1" onClick={() => respondToQuote(selectedOrder.id, false)}>
                      <X className="w-4 h-4" /> رد / Reject
                    </Button>
                  </div>
                </div>
              )}

              {selectedOrder.status === "confirmed" && (
                <p className="text-center text-sm text-primary font-bold bg-primary/10 p-3 rounded-xl">✅ تصدیق ہو گئی — ڈلیوری جلد ہوگی</p>
              )}

              {/* Delivering: Confirm Received */}
              {["delivering", "delivered"].includes(selectedOrder.status) && (
                <div className="space-y-2">
                  <p className="text-center text-sm text-orange-600 font-bold bg-orange-50 p-3 rounded-xl">🚴 ڈلیوری جاری ہے / Delivery in progress</p>
                  {(!selectedOrder.rider_id || selectedOrder.status === "delivered") && <Button
                    className="w-full gap-2"
                    onClick={() => confirmReceived(selectedOrder.id)}
                  >
                    <PackageCheck className="w-5 h-5" /> سامان مل گیا / Order Received ✅
                  </Button>}
                </div>
              )}

              {selectedOrder.status === "completed" && (
                <p className="text-center text-sm text-green-600 font-bold bg-green-50 p-3 rounded-xl">✅ مکمل ہو گیا / Completed</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerListOrders;
