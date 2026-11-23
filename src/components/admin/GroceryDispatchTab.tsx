import OperationsDateFilter from "./OperationsDateFilter";
import { applyOperationFilters, operationDates, operationRange, safeOperationSearch } from "@/lib/operationsList";
import { tr } from "@/lib/i18n/tr";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { RefreshCw, Truck } from "lucide-react";
import CourierShipmentDialog from "@/components/orders/CourierShipmentDialog";
import { AdminListTools, AdminPagination } from "./AdminListTools";
import { groceryReady, riderPresenceFresh } from "@/lib/riderOperations";
import { dispatchInterface } from "@/lib/courier";
import OperationConfirmDialog from "./OperationConfirmDialog";

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
  const [page, setPage] = useState(1);
  const [kind, setKind] = useState("cart");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [count, setCount] = useState(0);
  const [listError, setListError] = useState("");
  const request = useRef(0);
  const [expanded, setExpanded] = useState<string | null>(initialQuery || null);
  useEffect(() => { setQuery(initialQuery); setPage(1); setExpanded(initialQuery || null); }, [initialQuery]);
  const [cartOrders, setCartOrders] = useState<any[]>([]);
  const [listOrders, setListOrders] = useState<any[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [riderProfiles, setRiderProfiles] = useState<any[]>([]);
  const [fees, setFees] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [shipOrder, setShipOrder] = useState<any>(null);
  const [operation, setOperation] = useState<{ table: "grocery_cart_orders" | "grocery_list_orders"; order: any; cancel: boolean } | null>(null);
  const [cityDefaults, setCityDefaults] = useState<Record<string, any>>({});

  const fetchAll = useCallback(async (showLoading = true) => {
    const seq = ++request.current;
    if (operationDates(from, to).invalid) { setLoading(false); return; }
    if (showLoading) setLoading(true);
    try {
      const term = safeOperationSearch(query);
      const extras: string[] = [];
      if (term) {
        const shops = await supabase.from("grocery_stores").select("id").ilike("name", `%${term}%`).limit(200);
        if (shops.error) throw shops.error;
        if (shops.data?.length) extras.push(`store_id.in.(${shops.data.map(s => s.id).join(",")})`);
      }
      const table = kind === "cart" ? "grocery_cart_orders" : "grocery_list_orders";
      const columns = kind === "cart"
        ? "id,status,total_amount,delivery_address,delivery_lat,delivery_lng,rider_id,delivery_fee,delivery_method,dispatch_state,city_id,courier_name,tracking_number,courier_tracking_url,courier_payment_type,shipment_status,created_at,picked_up_at,delivery_stage,grocery_stores(name)"
        : "id,status,total_amount,delivery_address,delivery_lat,delivery_lng,rider_id,delivery_fee,dispatch_state,created_at,picked_up_at,delivery_stage,grocery_stores(name)";
      const [start, end] = operationRange(page);
      const [orders, riderResult, cities] = await Promise.all([
        applyOperationFilters(supabase.from(table).select(columns, { count: "exact" }).in("status", OPEN_STATUSES), from, to, query, ["delivery_address"], extras).order("created_at", { ascending: false }).order("id", { ascending: false }).range(start, end),
        supabase.from("riders").select("id, is_available, is_suspended, current_lat, current_lng, last_seen_at, location_updated_at"),
        (supabase.rpc as any)("get_city_services"),
      ]);
      for (const result of [orders, riderResult, cities]) if (result.error) throw result.error;
      const all = riderResult.data || [];
      const profiles = all.length ? await supabase.from("profiles").select("id, full_name, phone").in("id", all.map(r => r.id)) : { data: [], error: null };
      if (profiles.error) throw profiles.error;
      if (seq !== request.current) return;
      const map: Record<string, any> = {};
      (cities.data || []).forEach((c: any) => { map[c.id] = c; });
      setCityDefaults(map); setRiders(all); setRiderProfiles(profiles.data || []);
      setCartOrders(kind === "cart" ? orders.data || [] : []); setListOrders(kind === "list" ? orders.data || [] : []);
      setCount(orders.count || 0); setListError("");
      const last = Math.max(1, Math.ceil((orders.count || 0) / 20));
      if (page > last) setPage(last);
    } catch (error) { if (seq === request.current) setListError((error as Error).message); }
    finally { if (seq === request.current) setLoading(false); }
  }, [kind, query, page, from, to]);

  useEffect(() => { const timer = setTimeout(() => void fetchAll(), 300); return () => { clearTimeout(timer); request.current++; }; }, [fetchAll]);
  useEffect(() => {
    const ch = supabase.channel("admin-grocery-dispatch")
      .on("postgres_changes", { event: "*", schema: "public", table: "grocery_cart_orders" }, () => void fetchAll(false))
      .on("postgres_changes", { event: "*", schema: "public", table: "grocery_list_orders" }, () => void fetchAll(false))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "riders" }, ({ new: rider }) => {
        setRiders(current => current.map(row => row.id === rider.id ? { ...row, ...rider } : row));
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchAll]);

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
    if (!dispatchInterface(table === "grocery_cart_orders" ? "grocery_cart" : "grocery_list", order).showRiderControls) return;
    const fee = Number(fees[order.id] ?? order.delivery_fee ?? 0) || 0;
    const kind = table === "grocery_cart_orders" ? "grocery_cart" : "grocery_list";
    const { error } = await (supabase.rpc as any)("admin_offer_order_to_rider", {
      _kind: kind, _order_id: order.id, _rider_id: riderId, _delivery_fee: fee,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(tr("Offer sent to rider — awaiting acceptance 🏍️", "رائیڈر کو آفر بھیج دی گئی — قبولیت کا انتظار ہے 🏍️"));
    fetchAll();
  };

  const confirmForShop = async (table: "grocery_cart_orders" | "grocery_list_orders", orderId: string) => {
    const { error } = await supabase.from(table).update({ status: "confirmed" }).eq("id", orderId);
    if (error) { toast.error(error.message); return; }
    toast.success(tr("Order accepted — store will prepare items first", "آرڈر قبول کر لیا گیا — پہلے دکان سامان تیار کرے گی"));
    fetchAll();
  };



  const kindOf = (table: string) => table === "grocery_cart_orders" ? "grocery_cart" : "grocery_list";
  const isStale = (o: any) => Date.now() - new Date(o.created_at).getTime() > 2 * 60 * 60 * 1000;

  const cancelOrder = async (table: "grocery_cart_orders" | "grocery_list_orders", o: any) => {
    setOperation({ table, order: o, cancel: true });
  };

  const forceDeliver = async (table: "grocery_cart_orders" | "grocery_list_orders", o: any) => {
    setOperation({ table, order: o, cancel: false });
  };

  const renderOrder = (o: any, table: "grocery_cart_orders" | "grocery_list_orders", label: string) => {
    const delivery = dispatchInterface(table === "grocery_cart_orders" ? "grocery_cart" : "grocery_list", o);
    return (
    <div key={o.id} className="border rounded-lg px-3 py-2 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setExpanded(expanded === o.id ? null : o.id)}>{expanded === o.id ? tr("Closed", "بند") : tr("Details", "تفصیل")}</Button>
          <span className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8)}</span>
          <span className="ml-3 font-bold">Rs {o.total_amount ?? "—"}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px]">{label}</Badge>
          <Badge variant="outline" className="text-[10px]">{delivery.mode === "courier" ? tr("Courier", "کوریئر") : delivery.mode === "local" ? tr("Local rider", "مقامی رائیڈر") : tr("Delivery mode: review pending", "ترسیل کا طریقہ: جائزہ زیرِ التوا")}</Badge>
          <Badge className="text-[10px]">{o.status}</Badge>
          {isStale(o) && <Badge variant="destructive" className="text-[10px]">{tr("⚠️ Over 2 hours", "⚠️ 2 گھنٹے سے زائد")}</Badge>}
          {delivery.showRiderControls && !o.rider_id && o.dispatch_state === "searching" && <Badge variant="outline" className="text-[10px]">{tr("Offer sent", "آفر بھیجی گئی")}</Badge>}
          {delivery.showRiderControls && !o.rider_id && o.dispatch_state === "stuck" && <Badge variant="destructive" className="text-[10px]">{tr("Action required", "توجہ درکار")}</Badge>}
        </div>
      </div>
      <div className="grid gap-1 text-xs text-muted-foreground">
        <p className="break-words">🏪 {tr("Pickup:", "پک اپ:")} <span className="font-bold text-foreground">{o.grocery_stores?.name || tr("Store", "اسٹور")}</span></p>
        <p className="break-words">📍 {tr("Dropoff:", "منزل:")} {o.delivery_address || tr("Unknown", "پتہ نہیں")}</p>
      </div>
      {delivery.showRiderControls && !o.rider_id && o.dispatch_state === "stuck" && (
        <p className="rounded-md bg-destructive/10 px-2 py-1 text-[11px] font-bold text-destructive">
          {Number(o.total_amount) > 20000
            ? tr("Auto-dispatch stopped: order cash is above the rider cash limit (Rs 20,000). Assign a trusted rider manually.", "خودکار رائیڈر رک گیا: آرڈر کی رقم رائیڈر کی کیش حد (Rs 20,000) سے زیادہ ہے۔ کسی بھروسہ مند رائیڈر کو خود مقرر کریں۔")
            : tr("Auto-dispatch stopped: no rider accepted or no suitable vehicle online. Assign manually.", "خودکار رائیڈر رک گیا: کسی رائیڈر نے قبول نہیں کیا یا مناسب گاڑی آن لائن نہیں۔ خود مقرر کریں۔")}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {delivery.showRiderControls && o.picked_up_at && o.delivery_stage !== "return_pending" ? (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => forceDeliver(table, o)}>{tr("Mark delivered", "ڈیلیور ہو گیا")}</Button>
        ) : !o.picked_up_at ? (<>
          {delivery.showRiderControls && !o.rider_id && expanded !== o.id && <Button size="sm" className="h-7 text-xs" onClick={() => setExpanded(o.id)}>{tr("Assign rider", "رائیڈر مقرر کریں")}</Button>}
          <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => cancelOrder(table, o)}>{tr("Cancel order", "آرڈر منسوخ کریں")}</Button>
        </>) : delivery.showRiderControls ? (
          <p className="text-xs text-warning">{tr("Return in progress — confirm in Rider Operations", "واپسی جاری — رائیڈر آپریشنز میں تصدیق کریں")}</p>
        ) : null}
      </div>

      {expanded === o.id && <>
      {o.status === "pending" && (
        <div className="flex items-center justify-between gap-2 rounded-lg border bg-warning/10 px-3 py-2">
          <p className="text-xs text-warning font-bold">{tr("⏳ Not accepted by store yet", "⏳ دکاندار نے ابھی قبول نہیں کیا")}</p>
          <Button size="sm" className="h-7 text-xs" onClick={() => confirmForShop(table, o.id)}>
            {tr("Admin approval needed", "ایڈمن قبول کرے")}
          </Button>
        </div>
      )}

      {delivery.mode === "courier" && (
        <div className="rounded-lg border bg-background px-3 py-2 flex items-center justify-between gap-2 flex-wrap">
          <div className="min-w-0 break-words text-xs">
            <p className="font-bold">{tr("🚚 Courier shipment", "🚚 کورئیر شپمنٹ")}</p>
            {o.tracking_number ? (
              <p className="text-muted-foreground">
                {o.courier_name} · {o.tracking_number} · {o.shipment_status || "—"} · {o.courier_payment_type === "cod" ? "COD" : tr("Advance", "ایڈوانس")}
              </p>
            ) : (
              <p className="text-muted-foreground">{tr("Awaiting actual courier booking / CN", "اصل کوریئر بکنگ / CN کا انتظار")}</p>
            )}
            <p className="mt-1 text-warning">{tr("API booking: Pending · Manual record", "API بکنگ: زیرِ التوا · دستی ریکارڈ")}</p>
          </div>
          {delivery.canRecordShipment ? <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShipOrder(o)}>
            <Truck className="h-3 w-3" /> {o.tracking_number ? tr("Update courier record", "کوریئر ریکارڈ بدلیں") : tr("Record actual CN", "اصل CN درج کریں")}
          </Button> : <Badge variant="outline">{tr("Snapshot review pending", "محفوظ ترسیل کا جائزہ زیرِ التوا")}</Badge>}
        </div>
      )}
      {delivery.mode === "unknown" && <p className="text-xs text-warning">{tr("Delivery service review pending", "ڈیلیوری سروس کا جائزہ زیرِ التوا")}</p>}

      {delivery.showRiderControls && (o.rider_id ? (
        <p className="text-xs text-muted-foreground">
          {tr("🏍️ Rider:", "🏍️ رائیڈر:")} <span className="font-bold">{riderName(o.rider_id)}</span>
          {riderPhone(o.rider_id) && ` · 📞 ${riderPhone(o.rider_id)}`} {tr("· Delivery Fee Rs", "· ڈلیوری فیس Rs")} {o.delivery_fee || 0}
        </p>
      ) : (
        <div className="bg-secondary/20 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold">{tr("Delivery Fee:", "ڈلیوری فیس:")}</span>
            <Input
              type="number"
              className="h-7 w-24 text-xs"
              placeholder="Rs"
              value={fees[o.id] ?? ""}
              onChange={(e) => setFees((f) => ({ ...f, [o.id]: e.target.value }))}
            />
          </div>
          <p className="text-xs font-bold text-foreground">{groceryReady(o.status) ? tr("🏍️ Recently Available Riders", "🏍️ تازہ دستیاب رائیڈرز") : tr("Offers paused until order is ready", "سامان تیار ہونے تک آفر بند")}</p>
          {nearest(o).length === 0 ? (
            <p className="text-xs text-muted-foreground">{tr("No riders online", "کوئی آن لائن رائیڈر نہیں")}</p>
          ) : (
            nearest(o).map((r: any) => (
              <div key={r.id} className="flex items-center justify-between bg-background rounded-lg px-3 py-2 border">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{riderName(r.id)}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {riderPhone(r.id) && `📞 ${riderPhone(r.id)} · `}
                    {r.distance != null ? `📍 ${r.distance.toFixed(1)} ${tr("km away", "km دور")}` : tr("📍 Distance unknown", "📍 فاصلہ نامعلوم")}
                  </p>
                </div>
                <Button size="sm" className="h-7 text-xs ml-2" disabled={!groceryReady(o.status)} onClick={() => assign(table, o, r.id)}>{tr("Send Offer", "آفر بھیجیں")}</Button>
              </div>
            ))
          )}
        </div>
      ))}
      </>}
    </div>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>{tr("Grocery / Bazaar Dispatch", "گروسری / بازار ڈسپیچ")}</CardTitle>
        <Button variant="outline" size="sm" aria-label={tr("Refresh dispatch", "ڈسپیچ تازہ کریں")} onClick={() => void fetchAll(false)}><RefreshCw className="h-4 w-4" /></Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <AdminListTools query={query} onQuery={v => { setQuery(v); setPage(1); }} count={count} />
        <OperationsDateFilter from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); setPage(1); }} />
        <div className="flex flex-wrap gap-2">{[["cart", tr("Cart orders", "کارٹ آرڈرز")], ["list", tr("List / photo orders", "لسٹ / فوٹو آرڈرز")]].map(([value, label]) => <Button key={value} size="sm" variant={kind === value ? "default" : "outline"} onClick={() => { setKind(value); setPage(1); }}>{label}</Button>)}</div>
        {listError && <p role="alert" className="text-sm text-destructive">{listError}</p>}
        {loading ? (
          <p className="text-muted-foreground">{tr("Loading...", "لوڈ ہو رہا ہے...")}</p>
        ) : cartOrders.length === 0 && listOrders.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">{tr("No open grocery orders", "کوئی کھلا گروسری آرڈر نہیں")}</p>
        ) : (
          <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {cartOrders.map((o) => renderOrder(o, "grocery_cart_orders", tr("Grocery Cart", "گروسری کارٹ")))}
            {listOrders.map((o) => renderOrder(o, "grocery_list_orders", tr("List/Photo Order", "لسٹ/فوٹو آرڈر")))}
          </div>
        )}
        <AdminPagination page={page} count={count} onPage={setPage} />
      </CardContent>
      {operation && <OperationConfirmDialog title={operation.cancel ? tr("Cancel order", "آرڈر منسوخ کریں") : tr("Confirm delivery", "ڈیلیوری کی تصدیق")} onClose={() => setOperation(null)} onConfirm={async note => {
        const { error } = await (supabase.rpc as any)(operation.cancel ? "staff_cancel_order" : "staff_force_deliver", { _kind: kindOf(operation.table), _order_id: operation.order.id, _note: note });
        if (error) throw new Error(error.message);
        toast.success(tr("Saved", "محفوظ ہو گیا")); await fetchAll(false);
      }} reasons={operation.cancel ? [tr("Test order", "ٹیسٹ آرڈر"), tr("Customer refused", "کسٹمر نے انکار کیا"), tr("Rider unavailable", "رائیڈر دستیاب نہیں")] : []} />}
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
          onSaved={() => void fetchAll(false)}
        />
      )}
    </Card>
  );
};

export default GroceryDispatchTab;
