import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileImage, Check, X, Clock, Loader2, MapPin, Camera, Receipt, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useNewOrderAlert } from "@/hooks/useNewOrderAlert";
import NewOrderBanner from "@/components/NewOrderBanner";
import ListOrderPhotos from "./ListOrderPhotos";
import ListOrderPrint from "./ListOrderPrint";
import { listPhotos } from "@/lib/listOrders";
import { tr } from "@/lib/i18n/tr";

interface ShopkeeperListOrdersProps {
  storeId: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "نئی / New", color: "bg-yellow-100 text-yellow-800" },
  quoted: { label: "قیمت بتائی / Quoted", color: "bg-blue-100 text-blue-800" },
  confirmed: { label: "تصدیق شدہ / Confirmed", color: "bg-primary/20 text-primary" },
  ready_for_pickup: { label: "پک اَپ کے لیے تیار / Ready", color: "bg-primary/10 text-primary" },
  delivered: { label: "پہنچا دیا / Delivered", color: "bg-success/10 text-success" },
  returned_to_store: { label: "واپس / Returned", color: "bg-warning/10 text-warning" },
  delivering: { label: "ڈلیوری / Delivering", color: "bg-orange-100 text-orange-800" },
  completed: { label: "مکمل / Done", color: "bg-green-100 text-green-800" },
  cancelled: { label: "منسوخ / Cancelled", color: "bg-destructive/20 text-destructive" },
};

const ShopkeeperListOrders = ({ storeId }: ShopkeeperListOrdersProps) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [quoteAmount, setQuoteAmount] = useState("");
  const [weight, setWeight] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [blocks, setBlocks] = useState<any[]>([]);
  const [shopNotes, setShopNotes] = useState("");
  const [alternativesNote, setAlternativesNote] = useState("");
  const [updating, setUpdating] = useState(false);
  const [uploadingBill, setUploadingBill] = useState(false);
  const billInputRef = useRef<HTMLInputElement>(null);
  const galleryBillInputRef = useRef<HTMLInputElement>(null);
  const { newOrderCount, triggerAlert, dismissAlert } = useNewOrderAlert();

  const fetchOrders = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("grocery_list_orders")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false }).limit(100);
    setOrders(data || []);
    const {data: blocked} = await supabase.from("shop_customer_blocks").select("*").eq("store_id",storeId);
    setBlocks(blocked || []);
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
          triggerAlert();
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

  // Re-alert every 5 minutes while any list order is still un-accepted
  useEffect(() => {
    const timer = setInterval(() => {
      const stale = orders.filter(
        (o) => o.status === "pending" && Date.now() - new Date(o.created_at).getTime() > 5 * 60 * 1000
      );
      if (stale.length > 0) {
        triggerAlert(`${stale.length} راشن لسٹ ابھی تک قبول نہیں کی گئی!`);
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [orders, triggerAlert]);

  const action = async (orderId: string, operation: string, extra: any = {}) => {
    setUpdating(true);
    const {data, error} = await supabase.rpc("list_order_action", {_order_id:orderId,_action:operation,...extra});
    if(error) toast.error(error.message);
    else {toast.success(tr("Updated","تبدیلی محفوظ ہو گئی")); await fetchOrders(); setSelectedOrder(data);}
    setUpdating(false);
  };
  const updateOrder = (orderId:string, updates:any) => {
    if(updates.status==='cancelled') return action(orderId,'cancel');
    if(updates.status==='ready_for_pickup') return action(orderId,'ready');
    return action(orderId,'quote',{_amount:quoteAmount.trim()?Number(quoteAmount):null,_weight:weight.trim()?Number(weight):null,_note:shopNotes||null,_alternatives:alternativesNote||null});
  };

  const uploadBill = async (orderId: string, file: File) => {
    setUploadingBill(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `bills/${orderId}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("product-images").upload(path, file);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
      const { error: dbErr } = await supabase.rpc("list_order_action",{_order_id:orderId,_action:"bill",_bill:urlData.publicUrl});
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
    <div className="mb-4">
      <NewOrderBanner count={newOrderCount} onDismiss={dismissAlert} label="نئی فوٹو لسٹ آئی! / New photo list!" />
      <div className="p-4">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5 gap-2">
        {orders.map((order) => {
          const status = STATUS_MAP[order.status] || STATUS_MAP.pending;
          return (
            <Button variant="ghost"
              key={order.id}
              onClick={() => { setSelectedOrder(order); setQuoteAmount(String(order.items_subtotal ?? (order.total_amount > 0 ? order.total_amount - (order.delivery_fee || 0) : ""))); setWeight(String(order.delivery_weight_kg || "")); setBlockReason(""); setShopNotes(order.shopkeeper_notes || ""); setAlternativesNote(order.alternatives_note || ""); }}
              className="w-full h-auto min-h-28 flex items-center gap-2 p-3 bg-secondary rounded-lg text-start whitespace-normal"
            >
              <img src={order.image_url} alt="List" className="w-14 h-14 rounded-lg object-cover border" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString("en-PK")}
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
            </Button>
          );
        })}
      </div>

      {blocks.length>0 && <div className="mt-3 space-y-2">{blocks.map(b=><div key={b.customer_id} className="flex items-center gap-2 text-xs"><span className="flex-1">{b.reason}</span><Button variant="outline" size="sm" onClick={async()=>{const {error}=await supabase.from("shop_customer_blocks").delete().eq("store_id",storeId).eq("customer_id",b.customer_id);if(error)toast.error(error.message);else fetchOrders();}}>{tr("Unblock","بلاک ختم کریں")}</Button></div>)}</div>}
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>📋 آرڈر تفصیل / Order Detail</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <ListOrderPrint order={selectedOrder} storeId={storeId} />
              <ListOrderPhotos urls={listPhotos(selectedOrder)} />
              {selectedOrder.customer_revision && <p className="bg-accent p-3 rounded-lg text-sm"><strong>{tr("Requested items:","مطلوبہ اشیا:")}</strong> {selectedOrder.customer_revision}</p>}
              <div className="flex gap-2 flex-wrap"><Input className="flex-1 min-w-40" value={blockReason} onChange={e=>setBlockReason(e.target.value)} placeholder={tr("Reason to block new lists","نئی لسٹیں بند کرنے کی وجہ")} /><Button variant="destructive" disabled={updating||blockReason.trim().length<3} onClick={()=>action(selectedOrder.id,'block',{_note:blockReason})}>{tr("Block new lists","نئی لسٹیں بند کریں")}</Button></div>

              {selectedOrder.notes && (
                <p className="text-sm bg-accent/50 p-2 rounded-lg"><strong>نوٹ:</strong> {selectedOrder.notes}</p>
              )}
              <p className="text-sm flex items-center gap-1"><MapPin className="w-4 h-4" /> {selectedOrder.delivery_address}</p>

              {/* Bill Image Section */}
              {selectedOrder.bill_image_url && (
                <div className="space-y-1">
                  <p className="text-xs font-bold flex items-center gap-1"><Receipt className="w-3 h-3" /> 🧾 بل / Bill:</p>
                  <ListOrderPhotos urls={[selectedOrder.bill_image_url]} />
                </div>
              )}

              {/* Pending: Quote + Bill + Alternatives */}
              {["pending","quoted"].includes(selectedOrder.status) && (
                <div className="space-y-2">
                  <Input type="number" placeholder={tr("Final items price (Rs, optional for slip)","اشیا کی حتمی قیمت (رسید کے لیے اختیاری)")} value={quoteAmount} onChange={(e) => setQuoteAmount(e.target.value)} />
                  <Input type="number" min="0.01" step="0.01" value={weight} onChange={e=>setWeight(e.target.value)} placeholder={tr("Packed weight (kg)","سامان کا وزن (کلو)")} />

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
                    <Button disabled={updating || uploadingBill || (!quoteAmount && !selectedOrder.bill_image_url)} className="flex-1 gap-1" onClick={() => updateOrder(selectedOrder.id, {
                      status: "quoted",
                      total_amount: Number(quoteAmount),
                      shopkeeper_notes: shopNotes || null,
                      alternatives_note: alternativesNote || null,
                    })}>
                      {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} {quoteAmount ? tr("Send final price","حتمی قیمت بھیجیں") : tr("Send slip","صرف رسید بھیجیں")}
                    </Button>
                    <Button variant="destructive" disabled={updating} onClick={() => updateOrder(selectedOrder.id, { status: "cancelled" })}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Confirmed: Upload/update bill + Start delivery */}
              {selectedOrder.status === "confirmed" && (
                <div className="space-y-2">
                  {!selectedOrder.bill_image_url ? (
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 gap-1 text-xs" size="sm" disabled={uploadingBill} onClick={() => billInputRef.current?.click()}>
                        {uploadingBill ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />} 📷 کیمرہ سے بل
                      </Button>
                      <Button variant="outline" className="flex-1 gap-1 text-xs" size="sm" disabled={uploadingBill} onClick={() => galleryBillInputRef.current?.click()}>
                        {uploadingBill ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileImage className="w-4 h-4" />} 🖼 گیلری سے بل
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-xs font-bold flex items-center gap-1"><Receipt className="w-3 h-3" /> 🧾 بل:</p>
                      <img src={selectedOrder.bill_image_url} alt="Bill" className="w-full rounded-xl border max-h-32 object-contain bg-secondary" />
                    </div>
                  )}
                  <Button className="w-full" disabled={updating} onClick={() => updateOrder(selectedOrder.id, { status: "ready_for_pickup" })}>
                    سامان تیار / Ready for pickup
                  </Button>
                </div>
              )}

              {selectedOrder.status === "ready_for_pickup" && <p className="text-xs text-muted-foreground">پک اَپ کے لیے رائیڈر کا انتظار / Waiting for rider pickup</p>}

              {/* Delivering: Upload bill (if not done) + Complete */}
              {selectedOrder.status === "delivering" && (
                <div className="space-y-2">
                  {!selectedOrder.bill_image_url && (
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 gap-1 text-xs" size="sm" disabled={uploadingBill} onClick={() => billInputRef.current?.click()}>
                        {uploadingBill ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />} 📷 کیمرہ
                      </Button>
                      <Button variant="outline" className="flex-1 gap-1 text-xs" size="sm" disabled={uploadingBill} onClick={() => galleryBillInputRef.current?.click()}>
                        {uploadingBill ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileImage className="w-4 h-4" />} 🖼 گیلری
                      </Button>
                    </div>
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
    </div>
  );
};

export default ShopkeeperListOrders;
