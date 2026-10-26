import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RefreshCw, FileImage, MapPin, Eye } from "lucide-react";
import { AdminListTools, AdminPagination } from "./AdminListTools";
import { toast } from "sonner";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "نئی / Pending", color: "bg-yellow-100 text-yellow-800" },
  quoted: { label: "قیمت بتائی / Quoted", color: "bg-blue-100 text-blue-800" },
  confirmed: { label: "تصدیق / Confirmed", color: "bg-primary/20 text-primary" },
  ready_for_pickup: { label: "پک اَپ کے لیے تیار", color: "bg-primary/10 text-primary" },
  delivered: { label: "پہنچا دیا", color: "bg-success/10 text-success" },
  returned_to_store: { label: "واپس", color: "bg-warning/10 text-warning" },
  delivering: { label: "ڈلیوری / Delivering", color: "bg-orange-100 text-orange-800" },
  completed: { label: "مکمل / Done", color: "bg-green-100 text-green-800" },
  cancelled: { label: "منسوخ / Cancelled", color: "bg-destructive/20 text-destructive" },
};

const PhotoOrdersTab = ({ initialQuery = "" }: { initialQuery?: string }) => {
  const [query, setQuery] = useState(initialQuery);
  const [page, setPage] = useState(1);
  useEffect(() => { setQuery(initialQuery); setPage(1); }, [initialQuery]);
  const [orders, setOrders] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [filter, setFilter] = useState("all");

  const fetchData = async () => {
    setLoading(true);
    const [{ data: ordersData }, { data: storesData }] = await Promise.all([
      supabase.from("grocery_list_orders").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("grocery_stores").select("id, name"),
    ]);
    setOrders(ordersData || []);
    setStores(storesData || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("admin-photo-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "grocery_list_orders" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const getStoreName = (storeId: string) => stores.find(s => s.id === storeId)?.name || storeId.slice(0, 8);

  const filtered = orders.filter(o => (filter === "all" || o.status === filter) && `${o.id} ${getStoreName(o.store_id)} ${o.delivery_address || ""}`.toLowerCase().includes(query.trim().toLowerCase()));

  // Stats
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === "pending").length,
    confirmed: orders.filter(o => o.status === "confirmed" || o.status === "quoted").length,
    completed: orders.filter(o => o.status === "completed").length,
    cancelled: orders.filter(o => o.status === "cancelled").length,
    revenue: orders.filter(o => o.status === "completed").reduce((sum, o) => sum + (o.total_amount || 0), 0),
  };

  const updateStatus = async (orderId: string, status: string) => {
    const { error } = await supabase.from("grocery_list_orders").update({ status }).eq("id", orderId);
    if (error) toast.error(error.message);
    else { toast.success("اپڈیٹ ہو گیا"); setSelectedOrder(null); fetchData(); }
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "کل آرڈرز", value: stats.total, color: "text-foreground" },
          { label: "زیر التواء", value: stats.pending, color: "text-yellow-600" },
          { label: "جاری", value: stats.confirmed, color: "text-blue-600" },
          { label: "مکمل", value: stats.completed, color: "text-green-600" },
          { label: "آمدنی", value: `Rs ${stats.revenue}`, color: "text-primary" },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-xl font-extrabold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter + List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><FileImage className="w-5 h-5" /> فوٹو لسٹ آرڈرز</CardTitle>
          <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent>
          <AdminListTools query={query} onQuery={v => { setQuery(v); setPage(1); }} count={filtered.length} />
          {/* Filter Chips */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {[
              { key: "all", label: "سب" },
              { key: "pending", label: "زیر التواء" },
              { key: "quoted", label: "قیمت بتائی" },
              { key: "confirmed", label: "تصدیق شدہ" },
              { key: "delivering", label: "ڈلیوری" },
              { key: "completed", label: "مکمل" },
              { key: "cancelled", label: "منسوخ" },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => { setFilter(f.key); setPage(1); }}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${filter === f.key ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {loading ? <p className="text-muted-foreground">لوڈ ہو رہا ہے...</p> : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">کوئی آرڈر نہیں</p>
          ) : (
            <div className="space-y-2">
              {filtered.slice((page - 1) * 20, page * 20).map(order => {
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
                      <p className="text-[10px] text-muted-foreground">{new Date(order.created_at).toLocaleDateString("ur-PK")}</p>
                      <Eye className="w-4 h-4 text-muted-foreground mt-1" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <AdminPagination page={page} count={filtered.length} onPage={setPage} />
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={v => !v && setSelectedOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>📋 آرڈر تفصیل</DialogTitle></DialogHeader>
          {selectedOrder && (
            <div className="space-y-3">
              <img src={selectedOrder.image_url} alt="Ration list" className="w-full rounded-xl border max-h-64 object-contain bg-secondary" />
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">اسٹور:</span> <strong>{getStoreName(selectedOrder.store_id)}</strong></div>
                <div><span className="text-muted-foreground">سٹیٹس:</span> <Badge className={STATUS_MAP[selectedOrder.status]?.color}>{STATUS_MAP[selectedOrder.status]?.label}</Badge></div>
                <div><span className="text-muted-foreground">رقم:</span> <strong>Rs {selectedOrder.total_amount || 0}</strong></div>
                <div><span className="text-muted-foreground">ادائیگی:</span> {selectedOrder.payment_method}</div>
              </div>
              {selectedOrder.delivery_address && <p className="text-sm flex items-center gap-1"><MapPin className="w-4 h-4" /> {selectedOrder.delivery_address}</p>}
              {selectedOrder.notes && <p className="text-sm bg-accent/50 p-2 rounded-lg"><strong>کسٹمر نوٹ:</strong> {selectedOrder.notes}</p>}
              {selectedOrder.shopkeeper_notes && <p className="text-sm bg-primary/10 p-2 rounded-lg"><strong>دکاندار نوٹ:</strong> {selectedOrder.shopkeeper_notes}</p>}

              <div className="flex gap-2 flex-wrap">
                {["ready_for_pickup", "cancelled"].filter(s => s !== selectedOrder.status && !["delivered", "completed", "cancelled", "returned_to_store"].includes(selectedOrder.status) && (s !== "ready_for_pickup" || selectedOrder.status === "confirmed")).map(s => (
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
