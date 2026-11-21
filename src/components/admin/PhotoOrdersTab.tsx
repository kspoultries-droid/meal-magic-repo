import OperationsDateFilter from "./OperationsDateFilter";
import { applyOperationFilters, operationDates, operationRange, safeOperationSearch } from "@/lib/operationsList";
import { tr } from "@/lib/i18n/tr";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RefreshCw, FileImage, MapPin, Eye } from "lucide-react";
import { AdminListTools, AdminPagination } from "./AdminListTools";
import { toast } from "sonner";
import ListOrderPhotos from "@/components/grocery/ListOrderPhotos";
import { listPhotos } from "@/lib/listOrders";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: tr("New / Pending", "نئی / Pending"), color: "bg-warning/10 text-warning" },
  quoted: { label: tr("Quoted", "قیمت بتائی / Quoted"), color: "bg-accent text-accent-foreground" },
  confirmed: { label: tr("Confirmed", "تصدیق / Confirmed"), color: "bg-primary/20 text-primary" },
  ready_for_pickup: { label: tr("Ready for Pickup", "پک اَپ کے لیے تیار"), color: "bg-primary/10 text-primary" },
  delivered: { label: tr("Delivered", "پہنچا دیا"), color: "bg-success/10 text-success" },
  returned_to_store: { label: tr("Returned", "واپس"), color: "bg-warning/10 text-warning" },
  delivering: { label: tr("Delivering", "ڈلیوری / Delivering"), color: "bg-warning/10 text-warning" },
  completed: { label: tr("Completed", "مکمل / Done"), color: "bg-success/10 text-success" },
  cancelled: { label: tr("Cancelled", "منسوخ / Cancelled"), color: "bg-destructive/20 text-destructive" },
};

const PhotoOrdersTab = ({ initialQuery = "" }: { initialQuery?: string }) => {
  const { isAdmin, permissions } = useAuth();
  const canCancel = isAdmin || permissions.includes("support");
  const [query, setQuery] = useState(initialQuery);
  const [page, setPage] = useState(1);
  useEffect(() => { setQuery(initialQuery); setPage(1); }, [initialQuery]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [count, setCount] = useState(0);
  const [listError, setListError] = useState("");
  const request = useRef(0);
  const [orders, setOrders] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [filter, setFilter] = useState("all");

  const fetchData = useCallback(async (showLoading = true) => {
    const seq = ++request.current;
    if (operationDates(from, to).invalid) { setLoading(false); return; }
    if (showLoading) setLoading(true);
    try {
      const storeResult = await supabase.from("grocery_stores").select("id, name");
      if (storeResult.error) throw storeResult.error;
      const term = safeOperationSearch(query).toLowerCase();
      const matchingStores = (storeResult.data || []).filter(s => s.name.toLowerCase().includes(term));
      const extras = term && matchingStores.length ? [`store_id.in.(${matchingStores.map(s => s.id).join(",")})`] : [];
      let builder = supabase.from("grocery_list_orders").select("*", { count: "exact" });
      if (filter !== "all") builder = builder.eq("status", filter);
      const [start, end] = operationRange(page);
      const result = await applyOperationFilters(builder, from, to, query, ["delivery_address"], extras).order("created_at", { ascending: false }).order("id", { ascending: false }).range(start, end);
      if (result.error) throw result.error;
      if (seq !== request.current) return;
      setOrders(result.data || []); setStores(storeResult.data || []); setCount(result.count || 0); setListError("");
      setSelectedOrder((current: any) => current ? (result.data || []).find((row: any) => row.id === current.id) || current : null);
      const last = Math.max(1, Math.ceil((result.count || 0) / 20));
      if (page > last) setPage(last);
    } catch (error) { if (seq === request.current) setListError((error as Error).message); }
    finally { if (seq === request.current) setLoading(false); }
  }, [query, page, filter, from, to]);

  useEffect(() => { const timer = setTimeout(() => void fetchData(), 300); return () => { clearTimeout(timer); request.current++; }; }, [fetchData]);
  useEffect(() => {
    const channel = supabase.channel("admin-photo-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "grocery_list_orders" }, () => void fetchData(false)).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);
  const getStoreName = (storeId: string) => stores.find(s => s.id === storeId)?.name || storeId.slice(0, 8);

  const updateStatus = async (orderId: string, status: string) => {
    if (!canCancel || status !== "cancelled") return;
    const { error } = await (supabase as any).rpc("staff_cancel_order", { _kind: "grocery_list", _order_id: orderId, _note: "سپورٹ کی ہنگامی منسوخی" });
    if (error) toast.error(error.message);
    else { toast.success(tr("Updated", "اپڈیٹ ہو گیا")); setSelectedOrder(null); fetchData(); }
  };

  return (
    <div className="space-y-4">
      {/* Filter + List */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2"><FileImage className="w-5 h-5" /> {tr("Photo List Orders", "فوٹو لسٹ آرڈرز")}</CardTitle>
          <Button variant="outline" size="sm" aria-label={tr("Refresh photo orders", "فوٹو آرڈرز تازہ کریں")} onClick={() => void fetchData(false)}><RefreshCw className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent>
          <AdminListTools query={query} onQuery={v => { setQuery(v); setPage(1); }} count={count} />
          <OperationsDateFilter from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); setPage(1); }} />
          {listError && <p role="alert" className="mb-3 text-sm text-destructive">{listError}</p>}
          {/* Filter Chips */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {[
              { key: "all", label: tr("All", "سب") },
              { key: "pending", label: tr("Pending", "زیر التواء") },
              { key: "quoted", label: tr("Price Quoted", "قیمت بتائی") },
              { key: "confirmed", label: tr("Verified", "تصدیق شدہ") },
              { key: "delivering", label: tr("Delivery", "ڈلیوری") },
              { key: "completed", label: tr("Completed", "مکمل") },
              { key: "cancelled", label: tr("Cancelled", "منسوخ") },
            ].map(f => (
              <Button size="sm" variant={filter === f.key ? "default" : "outline"}
                key={f.key}
                onClick={() => { setFilter(f.key); setPage(1); }}
                className="text-xs"
              >
                {f.label}
              </Button>
            ))}
          </div>

          {loading ? <p className="text-muted-foreground">{tr("Loading...", "لوڈ ہو رہا ہے...")}</p> : orders.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{tr("No orders", "کوئی آرڈر نہیں")}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5 gap-2">
              {orders.map(order => {
                const status = STATUS_MAP[order.status] || STATUS_MAP.pending;
                return (
                  <div key={order.id} className="flex items-center gap-3 p-3 border rounded-xl hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => setSelectedOrder(order)}>
                    <img src={order.image_url} alt="List" className="w-14 h-14 rounded-lg object-cover border flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8)}</span>
                        <Badge className={status.color}>{status.label}</Badge>
                        {order.total_amount > 0 && <span className="text-sm font-bold text-primary">Rs {order.total_amount}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">🏪 {getStoreName(order.store_id)}</p>
                      {order.delivery_address && <p className="text-xs text-muted-foreground truncate flex items-center gap-1"><MapPin className="w-3 h-3" /> {order.delivery_address}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[10px] text-muted-foreground">{new Date(order.created_at).toLocaleDateString("en-GB", { timeZone: "Asia/Karachi" })}</p>
                      <Eye className="w-4 h-4 text-muted-foreground mt-1" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <AdminPagination page={page} count={count} onPage={setPage} />
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={v => !v && setSelectedOrder(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{tr("📋 Order Details", "📋 آرڈر تفصیل")}</DialogTitle></DialogHeader>
          {selectedOrder && (
            <div className="space-y-3">
              <ListOrderPhotos urls={listPhotos(selectedOrder)} />
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">{tr("Store:", "اسٹور:")}</span> <strong>{getStoreName(selectedOrder.store_id)}</strong></div>
                <div><span className="text-muted-foreground">{tr("Status:", "سٹیٹس:")}</span> <Badge className={STATUS_MAP[selectedOrder.status]?.color}>{STATUS_MAP[selectedOrder.status]?.label}</Badge></div>
                <div><span className="text-muted-foreground">{tr("Amount:", "رقم:")}</span> <strong>Rs {selectedOrder.total_amount || 0}</strong></div>
                <div><span className="text-muted-foreground">{tr("Payment:", "ادائیگی:")}</span> {selectedOrder.payment_method}</div>
              </div>
              {selectedOrder.delivery_address && <p className="text-sm flex items-center gap-1"><MapPin className="w-4 h-4" /> {selectedOrder.delivery_address}</p>}
              {selectedOrder.notes && <p className="text-sm bg-accent/50 p-2 rounded-lg"><strong>{tr("Customer Note:", "کسٹمر نوٹ:")}</strong> {selectedOrder.notes}</p>}
              {selectedOrder.shopkeeper_notes && <p className="text-sm bg-primary/10 p-2 rounded-lg"><strong>{tr("Merchant Note:", "دکاندار نوٹ:")}</strong> {selectedOrder.shopkeeper_notes}</p>}

              <div className="flex gap-2 flex-wrap">
                {(canCancel ? ["cancelled"] : []).filter(s => s !== selectedOrder.status && !["delivered", "completed", "cancelled", "returned_to_store"].includes(selectedOrder.status) && (s !== "ready_for_pickup" || selectedOrder.status === "confirmed")).map(s => (
                  <Button key={s} size="sm" variant="outline" className="text-xs h-7" onClick={() => updateStatus(selectedOrder.id, s)}>
                    {STATUS_MAP[s]?.label || s}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PhotoOrdersTab;
