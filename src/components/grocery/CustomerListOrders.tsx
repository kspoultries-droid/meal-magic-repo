import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, X, FileImage, MapPin, Clock } from "lucide-react";
import { toast } from "sonner";

interface CustomerListOrdersProps {
  storeId: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "بھیج دی گئی / Sent", color: "bg-yellow-100 text-yellow-800" },
  quoted: { label: "قیمت آ گئی / Quoted", color: "bg-blue-100 text-blue-800" },
  confirmed: { label: "تصدیق شدہ / Confirmed", color: "bg-primary/20 text-primary" },
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
        event: 'UPDATE',
        schema: 'public',
        table: 'grocery_list_orders',
        filter: `store_id=eq.${storeId}`,
      }, (payload) => {
        const updated = payload.new as any;
        if (updated.customer_id !== user.id) return;
        fetchOrders();
        if (updated.status === 'quoted') {
          toast(`💰 دکاندار نے قیمت بتائی: Rs ${updated.total_amount}`, { duration: 6000 });
        } else if (updated.status === 'delivering') {
          toast.success("🚴 ڈلیوری شروع ہو گئی! / Delivery started!");
        } else if (updated.status === 'completed') {
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

  if (orders.length === 0) return null;

  return (
    <div className="bg-card rounded-2xl border p-4 mb-4">
      <h3 className="font-bold text-foreground flex items-center gap-2 mb-3">
        <FileImage className="w-5 h-5 text-primary" />
        📋 میری فوٹو لسٹ آرڈرز / My Photo Orders
      </h3>
      <div className="space-y-2">
        {orders.map((order) => {
          const status = STATUS_LABELS[order.status] || STATUS_LABELS.pending;
          return (
            <button
              key={order.id}
              onClick={() => setSelectedOrder(order)}
              className="w-full flex items-center gap-3 p-3 bg-secondary rounded-xl text-left hover:bg-accent transition-colors"
            >
              <img src={order.image_url} alt="List" className="w-12 h-12 rounded-lg object-cover border" />
              <div className="flex-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
                {order.total_amount > 0 && <span className="text-sm font-bold text-primary ml-2">Rs {order.total_amount}</span>}
              </div>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </button>
          );
        })}
      </div>

      <Dialog open={!!selectedOrder} onOpenChange={(v) => !v && setSelectedOrder(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>📋 آرڈر تفصیل</DialogTitle></DialogHeader>
          {selectedOrder && (
            <div className="space-y-3">
              <img src={selectedOrder.image_url} alt="List" className="w-full rounded-xl border max-h-52 object-contain bg-secondary" />
              <p className="text-sm flex items-center gap-1"><MapPin className="w-4 h-4" /> {selectedOrder.delivery_address}</p>

              {selectedOrder.shopkeeper_notes && (
                <p className="text-sm bg-accent/50 p-2 rounded-lg"><strong>دکاندار:</strong> {selectedOrder.shopkeeper_notes}</p>
              )}

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
              {selectedOrder.status === "delivering" && (
                <p className="text-center text-sm text-orange-600 font-bold bg-orange-50 p-3 rounded-xl">🚴 ڈلیوری جاری ہے / Delivery in progress</p>
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
