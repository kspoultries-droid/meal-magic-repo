import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { RefreshCw, Truck } from "lucide-react";
import CourierShipmentDialog from "@/components/orders/CourierShipmentDialog";
import { AdminListTools } from "./AdminListTools";
import { groceryReady, riderPresenceFresh } from "@/lib/riderOperations";

const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const OPEN_STATUSES = ["pending", "quoted", "confirmed", "preparing", "picking", "packed", "ready_for_pickup", "ready", "delivering", "out_for_delivery"];

const GroceryDispatchTab = ({ initialQuery = "" }: { initialQuery?: string }) => {
  const [query, setQuery] = useState(initialQuery);
  const [expanded, setExpanded] = useState<string | null>(initialQuery || null);
  useEffect(() => { setQuery(initialQuery); setExpanded(initialQuery || null); }, [initialQuery]);
  const [cartOrders, setCartOrders] = useState<any[]>([]);
  const [listOrders, setListOrders] = useState<any[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [riderProfiles, setRiderProfiles] = useState<any[]>([]);
  const [fees, setFees] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [shipOrder, setShipOrder] = useState<any>(null);
  const [cityDefaults, setCityDefaults] = useState<Record<string, any>>({});

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: cart }, { data: list }, { data: ridersData }] = await Promise.all([
      supabase
        .from("grocery_cart_orders")
        .select("id,status,total_amount,delivery_address,delivery_lat,delivery_lng,rider_id,delivery_fee,delivery_method,dispatch_state,city_id,courier_name,tracking_number,courier_tracking_url,courier_payment_type,shipment_status,created_at,grocery_stores(name)")
        .in("status", OPEN_STATUSES)
        .order("created_at", { ascending: false })
        .limit(40),
      supabase
        .from("grocery_list_orders")
        .select("id,status,total_amount,delivery_address,delivery_lat,delivery_lng,rider_id,delivery_fee,dispatch_state,created_at,grocery_stores(name)")
        .in("status", OPEN_STATUSES)
        .order("created_at", { ascending: false })
        .limit(40),
      supabase.from("riders").select("id, is_available, is_suspended, current_lat, current_lng, last_seen_at, location_updated_at"),
    ]);
    const { data: cityRows } = await (supabase.rpc as any)("get_city_services");
    const map: Record<string, any> = {};
    (cityRows || []).forEach((c: any) => { map[c.id] = c; });
    setCityDefaults(map);
    setCartOrders(cart || []);
    setListOrders(list || []);
    const all = ridersData || [];
    setRiders(all);
    if (all.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, phone").in("id", all.map((r) => r.id));
      setRiderProfiles(profs || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    const ch = supabase
      .channel("admin-grocery-dispatch")
      .on("postgres_changes", { event: "*", schema: "public", table: "grocery_cart_orders" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "grocery_list_orders" }, () => fetchAll())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "riders" }, ({ new: rider }) => {
        setRiders(current => current.map(row => row.id === rider.id ? { ...row, ...rider } : row));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const riderName = (id: string) => riderProfiles.find((p) => p.id === id)?.full_name || id.slice(0, 8);
  const riderPhone = (id: string) => riderProfiles.find((p) => p.id === id)?.phone || "";

  const nearest = (o: any) => {
    const avail = riders.filter((r) => riderPresenceFresh(r) && r.current_lat != null && r.current_lng != null);
    if (o.delivery_lat == null || o.delivery_lng == null) return avail.slice(0, 5);
    return avail
      .map((r) => ({ ...r, distance: haversineKm(r.current_lat, r.current_lng, o.delivery_lat, o.delivery_lng) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);
  };

  const assign = async (table: "grocery_cart_orders" | "grocery_list_orders", order: any, riderId: string) => {
    const fee = Number(fees[order.id] ?? order.delivery_fee ?? 0) || 0;
    const kind = table === "grocery_cart_orders" ? "grocery_cart" : "grocery_list";
    const { error } = await (supabase.rpc as any)("admin_offer_order_to_rider", {
      _kind: kind, _order_id: order.id, _rider_id: riderId, _delivery_fee: fee,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("رائیڈر کو آفر بھیج دی گئی — قبولیت کا انتظار ہے 🏍️");
    fetchAll();
  };

  const confirmForShop = async (table: "grocery_cart_orders" | "grocery_list_orders", orderId: string) => {
    const { error } = await supabase.from(table).update({ status: "confirmed" }).eq("id", orderId);
    if (error) { toast.error(error.message); return; }
    toast.success("آرڈر قبول کر لیا گیا — پہلے دکان سامان تیار کرے گی");
    fetchAll();
  };



  const renderOrder = (o: any, table: "grocery_cart_orders" | "grocery_list_orders", label: string) => (
    <div key={o.id} className="border rounded-lg px-3 py-2 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setExpanded(expanded === o.id ? null : o.id)}>{expanded === o.id ? "بند" : "تفصیل"}</Button>
          <span className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8)}</span>
          <span className="ml-3 font-bold">Rs {o.total_amount ?? "—"}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px]">{label}</Badge>
          <Badge className="text-[10px]">{o.status}</Badge>
          {!o.rider_id && o.dispatch_state === "searching" && <Badge variant="outline" className="text-[10px]">آفر بھیجی گئی</Badge>}
          {!o.rider_id && o.dispatch_state === "stuck" && <Badge variant="destructive" className="text-[10px]">توجہ درکار</Badge>}
        </div>
      </div>
      <div className="grid gap-1 text-xs text-muted-foreground">
        <p>🏪 Pickup: <span className="font-bold text-foreground">{o.grocery_stores?.name || "اسٹور"}</span></p>
        <p>📍 Dropoff: {o.delivery_address || "پتہ نہیں"}</p>
      </div>

      {expanded === o.id && <>
      {o.status === "pending" && (
        <div className="flex items-center justify-between gap-2 rounded-lg border bg-warning/10 px-3 py-2">
          <p className="text-xs text-warning font-bold">⏳ دکاندار نے ابھی قبول نہیں کیا</p>
          <Button size="sm" className="h-7 text-xs" onClick={() => confirmForShop(table, o.id)}>
            ایڈمن قبول کرے
          </Button>
        </div>
      )}

      {table === "grocery_cart_orders" && (
        <div className="rounded-lg border bg-background px-3 py-2 flex items-center justify-between gap-2 flex-wrap">
          <div className="text-xs">
            <p className="font-bold">🚚 کورئیر شپمنٹ</p>
            {o.tracking_number ? (
              <p className="text-muted-foreground">
                {o.courier_name} · {o.tracking_number} · {o.shipment_status || "—"} · {o.courier_payment_type === "cod" ? "COD" : "ایڈوانس"}
              </p>
            ) : (
              <p className="text-muted-foreground">ابھی کوئی شپمنٹ نہیں بنی</p>
            )}
          </div>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShipOrder(o)}>
            <Truck className="h-3 w-3" /> {o.tracking_number ? "اپڈیٹ" : "شپمنٹ بنائیں"}
          </Button>
        </div>
      )}

      {o.rider_id ? (
        <p className="text-xs text-muted-foreground">
          🏍️ رائیڈر: <span className="font-bold">{riderName(o.rider_id)}</span>
          {riderPhone(o.rider_id) && ` · 📞 ${riderPhone(o.rider_id)}`} · ڈلیوری فیس Rs {o.delivery_fee || 0}
        </p>
      ) : (
        <div className="bg-secondary/20 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold">ڈلیوری فیس:</span>
            <Input
              type="number"
              className="h-7 w-24 text-xs"
              placeholder="Rs"
              value={fees[o.id] ?? ""}
              onChange={(e) => setFees((f) => ({ ...f, [o.id]: e.target.value }))}
            />
          </div>
          <p className="text-xs font-bold text-foreground">{groceryReady(o.status) ? "🏍️ تازہ دستیاب رائیڈرز" : "سامان تیار ہونے تک آفر بند"}</p>
          {nearest(o).length === 0 ? (
            <p className="text-xs text-muted-foreground">کوئی آن لائن رائیڈر نہیں</p>
          ) : (
            nearest(o).map((r: any) => (
              <div key={r.id} className="flex items-center justify-between bg-background rounded-lg px-3 py-2 border">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{riderName(r.id)}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {riderPhone(r.id) && `📞 ${riderPhone(r.id)} · `}
                    {r.distance != null ? `📍 ${r.distance.toFixed(1)} km دور` : "📍 فاصلہ نامعلوم"}
                  </p>
                </div>
                <Button size="sm" className="h-7 text-xs ml-2" disabled={!groceryReady(o.status)} onClick={() => assign(table, o, r.id)}>آفر بھیجیں</Button>
              </div>
            ))
          )}
        </div>
      )}
      </>}
    </div>
  );

  const matches = (o: any) => `${o.id} ${o.grocery_stores?.name || ""} ${o.delivery_address || ""}`.toLowerCase().includes(query.trim().toLowerCase());
  const filteredCart = cartOrders.filter(matches);
  const filteredList = listOrders.filter(matches);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>گروسری / بازار ڈسپیچ</CardTitle>
        <Button variant="outline" size="sm" onClick={fetchAll}><RefreshCw className="h-4 w-4" /></Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <AdminListTools query={query} onQuery={setQuery} count={filteredCart.length + filteredList.length} />
        {loading ? (
          <p className="text-muted-foreground">لوڈ ہو رہا ہے...</p>
        ) : cartOrders.length === 0 && listOrders.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">کوئی کھلا گروسری آرڈر نہیں</p>
        ) : (
          <>
            {filteredCart.map((o) => renderOrder(o, "grocery_cart_orders", "گروسری کارٹ"))}
            {filteredList.map((o) => renderOrder(o, "grocery_list_orders", "لسٹ/فوٹو آرڈر"))}
          </>
        )}
      </CardContent>
      {shipOrder && (
        <CourierShipmentDialog
          open={!!shipOrder}
          onOpenChange={(v) => !v && setShipOrder(null)}
          order={shipOrder}
          defaults={{
            courier: cityDefaults[shipOrder.city_id]?.default_courier,
            paymentType: cityDefaults[shipOrder.city_id]?.courier_payment_default,
            advancePercent: cityDefaults[shipOrder.city_id]?.courier_advance_percent,
          }}
          onSaved={fetchAll}
        />
      )}
    </Card>
  );
};

export default GroceryDispatchTab;
