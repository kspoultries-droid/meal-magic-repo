import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileImage, Check, X, Clock, Loader2, MapPin, Camera, Receipt, AlertTriangle } from "lucide-react";
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
  const [alternativesNote, setAlternativesNote] = useState("");
  const [updating, setUpdating] = useState(false);
  const [uploadingBill, setUploadingBill] = useState(false);
  const billInputRef = useRef<HTMLInputElement>(null);
  const galleryBillInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    fetchOrders();
    const channel = supabase
      .channel(`list-orders-${storeId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'grocery_list_orders',
        filter: `store_id=eq.${storeId}`,
      }, (payload) => {
        fetchOrders();
        if (payload.eventType === 'INSERT') {
          toast("📸 نئی راشن لسٹ آئی! / New ration list received!", { duration: 5000 });
        } else if (payload.eventType === 'UPDATE') {
          const newStatus = (payload.new as any)?.status;
          if (newStatus === 'confirmed') {
            toast.success("✅ کسٹمر نے قیمت منظور کر لی! / Customer accepted quote!");
          }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [storeId]);

  const updateOrder = async (orderId: string, updates: any) => {
    setUpdating(true);
    const { error } = await supabase.from("grocery_list_orders").update(updates).eq("id", orderId);
    if (error) toast.error(error.message);
    else { toast.success("اپڈیٹ ہو گیا / Updated"); fetchOrders(); setSelectedOrder(null); }
    setUpdating(false);
  };

  const uploadBill = async (orderId: string, file: File) => {
    setUploadingBill(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `bills/${orderId}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("product-images").upload(path, file);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
      const { error: dbErr } = await supabase.from("grocery_list_orders")
        .update({ bill_image_url: urlData.publicUrl } as any)
        .eq("id", orderId);
      if (dbErr) throw dbErr;
      toast.success("🧾 بل اپلوڈ ہو گیا / Bill uploaded!");
      fetchOrders();
      // Update selected order locally
      setSelectedOrder((prev: any) => prev ? { ...prev, bill_image_url: urlData.publicUrl } : null);
    } catch (err: any) {
      toast.error(err.message || "بل اپلوڈ ناکام");
    }
    setUploadingBill(false);
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
              onClick={() => { setSelectedOrder(order); setQuoteAmount(String(order.total_amount || "")); setShopNotes(order.shopkeeper_notes || ""); setAlternativesNote(order.alternatives_note || ""); }}
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

      {/* Hidden bill inputs - camera & gallery */}
      <input
        ref={billInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && selectedOrder) uploadBill(selectedOrder.id, file);
          e.target.value = "";
        }}
      />
      <input
        ref={galleryBillInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && selectedOrder) uploadBill(selectedOrder.id, file);
          e.target.value = "";
        }}
      />

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(v) => !v && setSelectedOrder(null)}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
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

              {/* Bill Image Section */}
              {selectedOrder.bill_image_url && (
                <div className="space-y-1">
                  <p className="text-xs font-bold flex items-center gap-1"><Receipt className="w-3 h-3" /> 🧾 بل / Bill:</p>
                  <img src={selectedOrder.bill_image_url} alt="Bill" className="w-full rounded-xl border max-h-48 object-contain bg-secondary" />
                </div>
              )}

              {/* Pending: Quote + Bill + Alternatives */}
              {selectedOrder.status === "pending" && (
                <div className="space-y-2">
                  <Input type="number" placeholder="کل قیمت / Total Price (Rs)" value={quoteAmount} onChange={(e) => setQuoteAmount(e.target.value)} />

                  {/* Bill upload with quote */}
                  {selectedOrder.bill_image_url ? (
                    <div className="space-y-1">
                      <p className="text-xs font-bold flex items-center gap-1"><Receipt className="w-3 h-3" /> 🧾 بل لگا دیا گیا:</p>
                      <img src={selectedOrder.bill_image_url} alt="Bill" className="w-full rounded-xl border max-h-32 object-contain bg-secondary" />
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 gap-1 text-xs"
                        size="sm"
                        disabled={uploadingBill}
                        onClick={() => billInputRef.current?.click()}
                      >
                        {uploadingBill ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                        📷 کیمرہ سے بل
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 gap-1 text-xs"
                        size="sm"
                        disabled={uploadingBill}
                        onClick={() => galleryBillInputRef.current?.click()}
                      >
                        {uploadingBill ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileImage className="w-4 h-4" />}
                        🖼 گیلری سے بل
                      </Button>
                    </div>
                  )}

                  <Input placeholder="دکاندار نوٹ / Your notes (optional)" value={shopNotes} onChange={(e) => setShopNotes(e.target.value)} />
                  <Textarea
                    placeholder="🔄 متبادل اشیاء / Alternatives (e.g. Sufi oil nahi hai, Dalda chalegi?)"
                    value={alternativesNote}
                    onChange={(e) => setAlternativesNote(e.target.value)}
                    className="text-sm min-h-[60px]"
                  />
                  <div className="flex gap-2">
                    <Button disabled={updating || !quoteAmount} className="flex-1 gap-1" onClick={() => updateOrder(selectedOrder.id, {
                      status: "quoted",
                      total_amount: Number(quoteAmount),
                      shopkeeper_notes: shopNotes || null,
                      alternatives_note: alternativesNote || null,
                    })}>
                      {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} قیمت بھیجیں / Quote
                    </Button>
                    <Button variant="destructive" disabled={updating} onClick={() => updateOrder(selectedOrder.id, { status: "cancelled" })}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Confirmed: Upload bill + Start delivery */}
              {selectedOrder.status === "confirmed" && (
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    disabled={uploadingBill}
                    onClick={() => billInputRef.current?.click()}
                  >
                    {uploadingBill ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                    🧾 بل کی تصویر لگائیں / Upload Bill
                  </Button>
                  <Button className="w-full" disabled={updating} onClick={() => updateOrder(selectedOrder.id, { status: "delivering" })}>
                    ڈلیوری شروع / Start Delivery
                  </Button>
                </div>
              )}

              {/* Delivering: Upload bill (if not done) + Complete */}
              {selectedOrder.status === "delivering" && (
                <div className="space-y-2">
                  {!selectedOrder.bill_image_url && (
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      disabled={uploadingBill}
                      onClick={() => billInputRef.current?.click()}
                    >
                      {uploadingBill ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                      🧾 بل لگائیں / Upload Bill
                    </Button>
                  )}
                  <p className="text-xs text-center text-muted-foreground">⏳ کسٹمر سامان وصول کرے گا / Waiting for customer to confirm receipt</p>
                </div>
              )}

              {(selectedOrder.status === "quoted") && (
                <p className="text-xs text-center text-muted-foreground">⏳ کسٹمر کی تصدیق کا انتظار / Waiting for customer confirmation</p>
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

export default ShopkeeperListOrders;
