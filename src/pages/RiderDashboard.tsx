import { useEffect, useState, useRef } from "react";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { LogOut, Bike, ArrowLeft, RefreshCw, Package, Navigation, MapPin, Phone, MessageCircle, Wallet, ChevronDown, ChevronUp } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useNewOrderAlert } from "@/hooks/useNewOrderAlert";
import NewOrderBanner from "@/components/NewOrderBanner";
import RiderOfferCard from "@/components/rider/RiderOfferCard";
import OrderChat from "@/components/orders/OrderChat";
import RiderInsights from "@/components/rider/RiderInsights";
import RiderScore from "@/components/rider/RiderScore";
import RiderOfferHistory from "@/components/rider/RiderOfferHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RiderLevelShifts from "@/components/rider/RiderLevelShifts";
import RiderHotspots from "@/components/rider/RiderHotspots";
import { useRiderLocation } from "@/contexts/RiderLocationContext";



const vibrate = (pattern: number[] = [300, 120, 300, 120, 500]) => {
  try { navigator.vibrate?.(pattern); } catch { /* not supported */ }
};

const STATUS_KEY: Record<string, string> = {
  confirmed: "rider.statusConfirmed",
  preparing: "rider.statusPreparing",
  delivering: "rider.statusDelivering",
  delivered: "rider.statusDone",
  completed: "rider.statusDone",
  cancelled: "rider.statusCancelled",
};

const RiderDashboard = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [hasRole, setHasRole] = useState<boolean | null>(null);
  const [riderData, setRiderData] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [groceryOrders, setGroceryOrders] = useState<any[]>([]);
  const [contacts, setContacts] = useState<Record<string, { name: string | null; phone: string | null }>>({});
  const [loadingData, setLoadingData] = useState(true);
  const { sharing: locationOk, error: locationStatus, retry: retryLocation } = useRiderLocation();
  const [dateFilter, setDateFilter] = useState<"today" | "yesterday" | "week" | "custom">("today");
  const [customDate, setCustomDate] = useState(new Date().toISOString().slice(0, 10));
  const [showCompleted, setShowCompleted] = useState(false);
  const [tab, setTab] = useState("orders");
  const { newOrderCount, triggerAlert, dismissAlert } = useNewOrderAlert();
  const contactsRef = useRef<Record<string, any>>({});

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      supabase.rpc("has_role", { _user_id: user.id, _role: "rider" as any })
        .then(({ data }) => setHasRole(!!data));
    }
  }, [user]);

  const ensureRiderProfile = async () => {
    if (!user) return null;
    const { data: approvedApp } = await supabase
      .from("partner_applications").select("city_id")
      .eq("user_id", user.id).eq("applicant_type", "rider").eq("status", "approved")
      .order("reviewed_at", { ascending: false }).limit(1).maybeSingle();

    const { data, error } = await supabase.from("riders")
      .insert({ id: user.id, city_id: approvedApp?.city_id || null, is_available: false })
      .select("*").maybeSingle();
    if (error) { toast.error("رائیڈر پروفائل نہیں بنی: " + error.message); return null; }
    return data;
  };

  const loadContact = async (kind: string, id: string) => {
    if (contactsRef.current[id]) return;
    contactsRef.current[id] = true;
    const { data } = await supabase.rpc("get_order_customer_contact", { _kind: kind, _order_id: id });
    const row = Array.isArray(data) ? data[0] : null;
    if (row) setContacts((c) => ({ ...c, [id]: { name: row.customer_name, phone: row.customer_phone } }));
  };

  const fetchData = async (showLoader = true) => {
    if (!user) return;
    if (showLoader) setLoadingData(true);
    const [{ data: rider }, { data: assigned }, { data: gCart }, { data: gList }, { data: sum }] = await Promise.all([
      supabase.from("riders").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("orders").select("*, order_items(*), restaurants(name, description, delivery_mode, pickup_address, pickup_lat, pickup_lng)").eq("rider_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("grocery_cart_orders").select("id,status,total_amount,delivery_fee,delivery_address,delivery_lat,delivery_lng,rider_id,created_at,items,grocery_stores(name)").eq("rider_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("grocery_list_orders").select("id,status,total_amount,delivery_fee,delivery_address,delivery_lat,delivery_lng,rider_id,created_at,grocery_stores(name)").eq("rider_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.rpc("get_rider_summary"),
    ]);
    const nextRider = rider || await ensureRiderProfile();
    setRiderData(nextRider);
    setSummary(Array.isArray(sum) ? sum[0] : sum);
    const CLOSED = ["delivered", "completed", "cancelled"];
    const sortedAssigned = (assigned || []).slice().sort((a: any, b: any) => {
      const aClosed = CLOSED.includes(a.status) ? 1 : 0;
      const bClosed = CLOSED.includes(b.status) ? 1 : 0;
      if (aClosed !== bClosed) return aClosed - bClosed;
      return a.created_at < b.created_at ? 1 : -1;
    });
    setMyOrders(sortedAssigned);
    const grocery = [
      ...(gCart || []).map((o: any) => ({ ...o, _table: "grocery_cart_orders" as const, _kind: "grocery_cart", _label: t("rider.groceryCart") })),
      ...(gList || []).map((o: any) => ({ ...o, _table: "grocery_list_orders" as const, _kind: "grocery_list", _label: t("rider.listOrder") })),
    ].sort((a, b) => {
      const aClosed = CLOSED.includes(a.status) ? 1 : 0;
      const bClosed = CLOSED.includes(b.status) ? 1 : 0;
      if (aClosed !== bClosed) return aClosed - bClosed;
      return a.created_at < b.created_at ? 1 : -1;
    });
    setGroceryOrders(grocery);

    (assigned || []).filter((o: any) => !["delivered", "completed", "cancelled"].includes(o.status))
      .forEach((o: any) => loadContact("food", o.id));
    grocery.filter((o: any) => !["delivered", "completed", "cancelled"].includes(o.status))
      .forEach((o: any) => loadContact(o._kind, o.id));

    setLoadingData(false);
  };

  useEffect(() => { if (hasRole) fetchData(!riderData); }, [hasRole, user]);

  // Presence heartbeat: keeps admin command center aware that the rider app is live
  useEffect(() => {
    if (!hasRole || !user) return;
    const beat = () => { void supabase.rpc("rider_heartbeat" as any); };
    beat();
    const timer = window.setInterval(beat, 60000);
    const onVisible = () => { if (document.visibilityState === "visible") beat(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [hasRole, user]);

  // Realtime online/offline status for this rider (admin can also toggle it)
  useEffect(() => {
    if (!hasRole || !user) return;
    const channel = supabase
      .channel(`rider-self-${user.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "riders", filter: `id=eq.${user.id}` }, (p: any) => {
        setRiderData((prev: any) => ({ ...(prev || {}), ...(p.new || {}) }));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [hasRole, user]);

  useEffect(() => {
    if (!hasRole || !user) return;
    const assignedToMe = (nw: any, old: any) => nw.rider_id === user.id && old.rider_id !== user.id;
    const channel = supabase
      .channel("rider-orders")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `rider_id=eq.${user.id}` }, (p: any) => {
        fetchData(false);
        if (assignedToMe(p.new || {}, p.old || {})) { triggerAlert(); vibrate(); toast.success("🏍️ نیا آرڈر آپ کو اسائن ہوا ہے!"); }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "grocery_cart_orders" }, (p: any) => {
        if (p.new?.rider_id !== user.id && p.old?.rider_id !== user.id) return;
        fetchData(false);
        if (assignedToMe(p.new || {}, p.old || {})) { triggerAlert(); vibrate(); toast.success("🛒 نیا گروسری آرڈر آپ کو اسائن ہوا ہے!"); }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "grocery_list_orders" }, (p: any) => {
        if (p.new?.rider_id !== user.id && p.old?.rider_id !== user.id) return;
        fetchData(false);
        if (assignedToMe(p.new || {}, p.old || {})) { triggerAlert(); vibrate(); toast.success("🛒 نیا آرڈر آپ کو اسائن ہوا ہے!"); }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [hasRole, user]);

  const toggleAvailability = async () => {
    if (!user) return;
    const currentRider = riderData || await ensureRiderProfile();
    if (!currentRider) return;
    const next = !currentRider.is_available;
    setRiderData((prev: any) => ({ ...(prev || currentRider), is_available: next }));
    const { error } = await supabase.from("riders")
      .update({ is_available: next, last_seen_at: new Date().toISOString() } as any)
      .eq("id", user.id);
    if (error) {
      setRiderData((prev: any) => ({ ...(prev || currentRider), is_available: !next }));
      toast.error(error.message);
      return;
    }
    toast.success(next ? t("rider.wentOnline") : t("rider.wentOffline"));
    fetchData(false);
  };

  const uploadProof = async (order: any, file: File) => {
    if (!user) return;
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${user.id}/${order.id}-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("delivery-proofs").upload(path, file);
    if (error) { toast.error(t("rider.uploadFailed") + ": " + error.message); return; }
    const { error: updErr } = await supabase.from("orders").update({ delivery_proof_path: path } as any).eq("id", order.id);
    if (updErr) { toast.error(updErr.message); return; }
    toast.success(t("rider.proofSaved"));
    fetchData(false);
  };

  const markStep = async (order: any, step: "arrived_pickup" | "arrived_customer") => {
    const pos = await new Promise<GeolocationPosition | null>((res) => {
      if (!navigator.geolocation) return res(null);
      navigator.geolocation.getCurrentPosition(res, () => res(null), { enableHighAccuracy: true, timeout: 10000 });
    });
    const { error } = await (supabase.rpc as any)("rider_mark_step", {
      _order_id: order.id, _step: step,
      _lat: pos?.coords.latitude ?? null, _lng: pos?.coords.longitude ?? null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(step === "arrived_pickup" ? "ہوٹل پر پہنچنا درج ہو گیا" : "کسٹمر کو بتا دیا گیا");
    fetchData(false);
  };

  const markDelivered = async (order: any) => {
    if (order.status !== "delivering") { toast.error(t("rider.onlyAfterSent")); return; }
    const { error } = await supabase.from("orders").update({ status: "delivered" }).eq("id", order.id);
    if (error) { toast.error(error.message); return; }
    toast.success(t("rider.markDelivered"));
    fetchData(false);
  };

  const markGroceryDelivered = async (order: any) => {
    // Grocery cart orders must pass through "delivering" (picked up) before "delivered".
    if (order._table === "grocery_cart_orders" && !["delivering", "out_for_delivery"].includes(order.status)) {
      const { error: pickErr } = await supabase.from(order._table).update({ status: "delivering" }).eq("id", order.id);
      if (pickErr) { toast.error(pickErr.message); return; }
    }
    const { error } = await supabase.from(order._table).update({ status: "delivered" }).eq("id", order.id);
    if (error) { toast.error(error.message); return; }
    toast.success(t("rider.groceryDelivered"));
    fetchData(false);
  };

  const mapLink = (address?: string | null, lat?: number | null, lng?: number | null) => {
    if (lat && lng) return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    if (address) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    return "";
  };

  const ContactStrip = ({ id }: { id: string }) => {
    const c = contacts[id];
    if (!c || (!c.name && !c.phone)) return null;
    const digits = (c.phone || "").replace(/[^0-9]/g, "");
    const wa = digits ? (digits.startsWith("0") ? `92${digits.slice(1)}` : digits) : "";
    return (
      <div className="rounded-lg bg-primary/5 border border-primary/20 p-2.5 flex items-center justify-between gap-2 flex-wrap">
        <div className="text-xs">
          <p className="font-extrabold text-foreground">{c.name || t("rider.customer")}</p>
          {c.phone && <p className="text-muted-foreground font-mono">{c.phone}</p>}
        </div>
        {c.phone && (
          <div className="flex gap-1.5">
            <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-[11px] font-bold">
              <Phone className="w-3 h-3" /> {t("rider.call")}
            </a>
            {wa && (
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full bg-success text-success-foreground px-3 py-1.5 text-[11px] font-bold">
                <MessageCircle className="w-3 h-3" /> {t("rider.whatsapp")}
              </a>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading || hasRole === null) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">{t("common.loading")}</div>;

  if (!hasRole) return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="max-w-md">
        <CardContent className="p-8 text-center">
          <Bike className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold mb-2">{t("rider.notRider")}</h2>
          <p className="text-muted-foreground mb-4">{t("rider.askAdminRole")}</p>
          <Button variant="outline" onClick={() => navigate("/")}>{t("rider.goBack")}</Button>
        </CardContent>
      </Card>
    </div>
  );

  const cashDue = Number(summary?.cash_due ?? 0);
  const CLOSED = ["delivered", "completed", "cancelled"];
  const startOfDay = (date: Date) => { const value = new Date(date); value.setHours(0, 0, 0, 0); return value; };
  const dateRange = (() => {
    const now = new Date();
    if (dateFilter === "week") return { start: new Date(startOfDay(now).getTime() - 6 * 86400000), end: new Date() };
    const selected = dateFilter === "custom" ? new Date(`${customDate}T00:00:00`) : new Date(now);
    if (dateFilter === "yesterday") selected.setDate(selected.getDate() - 1);
    const start = startOfDay(selected);
    return { start, end: new Date(start.getTime() + 86400000 - 1) };
  })();
  const inSelectedRange = (order: any) => {
    const created = new Date(order.created_at).getTime();
    return created >= dateRange.start.getTime() && created <= dateRange.end.getTime();
  };
  const activeFoodOrders = myOrders.filter((order) => !CLOSED.includes(order.status));
  const activeGroceryOrders = groceryOrders.filter((order) => !CLOSED.includes(order.status));
  const completedOrders = [
    ...myOrders.filter((order) => CLOSED.includes(order.status) && inSelectedRange(order)).map((order) => ({ ...order, _historyLabel: t("rider.food") })),
    ...groceryOrders.filter((order) => CLOSED.includes(order.status) && inSelectedRange(order)).map((order) => ({ ...order, _historyLabel: order._label })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="min-h-screen bg-background pb-8">
      <NewOrderBanner count={newOrderCount} onDismiss={dismissAlert} label={t("rider.newOrderAssigned")} />

      {/* Compact header */}
      <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur px-3 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate("/")}><ArrowLeft className="h-4 w-4" /></Button>
          <div className="min-w-0">
            <h1 className="text-sm font-extrabold text-primary leading-tight">{t("dash.rider")}</h1>
            <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <LanguageSwitcher />
          <div className="flex items-center gap-1.5">
            <Switch checked={riderData?.is_available || false} onCheckedChange={toggleAvailability} />
            <span className={`flex items-center gap-1 text-[11px] font-bold ${riderData?.is_available ? "text-success" : "text-muted-foreground"}`}>
              <span className={`relative flex h-2 w-2 ${riderData?.is_available ? "" : "opacity-60"}`}>
                {riderData?.is_available && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/70" />}
                <span className={`relative inline-flex h-2 w-2 rounded-full ${riderData?.is_available ? "bg-success" : "bg-muted-foreground"}`} />
              </span>
              {riderData?.is_available ? t("common.online") : t("common.offline")}
            </span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { signOut(); navigate("/"); }}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="p-3 space-y-3">
        {locationStatus ? (
          <div className="bg-warning/10 border border-warning/30 rounded-lg px-3 py-2 flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-warning" />
            <span className="text-xs text-warning font-bold">{locationStatus}</span>
            <Button variant="ghost" size="icon" aria-label="GPS دوبارہ تلاش کریں" onClick={retryLocation}><RefreshCw className="h-4 w-4" /></Button>
          </div>
        ) : locationOk ? (
          <p className="text-[10px] text-muted-foreground text-center">{t("rider.sharingLocation")}</p>
        ) : null}

        {riderData?.break_until && new Date(riderData.break_until).getTime() > Date.now() && (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2">
            <span className="text-xs font-bold text-warning">
              ⏸ مسلسل 3 آفر چھوٹنے پر وقفہ — {new Date(riderData.break_until).toLocaleTimeString("ur-PK", { hour: "2-digit", minute: "2-digit" })} تک نئے آرڈر نہیں آئیں گے
            </span>
            <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={async () => {
              const { error } = await (supabase.rpc as any)("rider_end_break");
              if (error) toast.error(error.message); else { toast.success("وقفہ ختم — آرڈر دوبارہ آئیں گے"); fetchData(false); }
            }}>ابھی شروع کریں</Button>
          </div>
        )}

        {user && <RiderOfferCard riderId={user.id} onChanged={() => fetchData(false)} />}

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-10">
            <TabsTrigger value="orders" className="text-xs font-extrabold">
              {t("common.orders")}{activeFoodOrders.length + activeGroceryOrders.length > 0 ? ` (${activeFoodOrders.length + activeGroceryOrders.length})` : ""}
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs font-extrabold">{t("common.history")}</TabsTrigger>
            <TabsTrigger value="performance" className="text-xs font-extrabold">{t("common.performance")}</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-3 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: t("rider.activeOrders"), value: activeFoodOrders.length + activeGroceryOrders.length, cls: "text-primary" },
                { label: t("rider.todayDeliveries"), value: summary?.today_deliveries ?? 0, cls: "text-foreground" },
                { label: t("rider.todayEarnings"), value: `Rs ${Math.round(Number(summary?.today_earnings ?? 0))}`, cls: "text-success" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border bg-card px-1.5 py-2 text-center">
                  <p className="text-[9px] text-muted-foreground leading-tight">{s.label}</p>
                  <p className={`text-sm font-extrabold ${s.cls}`}>{s.value}</p>
                </div>
              ))}
            </div>


        {/* My assigned food orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <CardTitle className="text-base flex items-center gap-2"><Package className="w-4 h-4" /> {t("rider.myOrders")}</CardTitle>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => fetchData(false)}><RefreshCw className="h-3.5 w-3.5" /></Button>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingData ? <p className="text-sm text-muted-foreground">{t("common.loading")}</p> : activeFoodOrders.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">{t("rider.noAssigned")}</p>
            ) : (
              <div className="space-y-2.5">
                {activeFoodOrders.map((o) => {
                  const pickupAddr = o.restaurants?.pickup_address || o.restaurants?.description || "";
                  const pickupMap = mapLink(pickupAddr, o.restaurants?.pickup_lat, o.restaurants?.pickup_lng);
                  const dropoffMap = mapLink(o.delivery_address, o.delivery_lat, o.delivery_lng);
                  const isClosed = ["delivered", "completed", "cancelled"].includes(o.status);
                  return (
                    <div key={o.id} className="rounded-xl border bg-secondary/20 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-mono text-[10px] text-muted-foreground">#{o.id.slice(0, 8)}</p>
                          <p className="font-extrabold">Rs {o.total_amount}</p>
                        </div>
                        <Badge className={isClosed && o.status !== "cancelled" ? "bg-success text-success-foreground" : o.status === "cancelled" ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"}>
                          {STATUS_KEY[o.status] ? t(STATUS_KEY[o.status] as any) : o.status}
                        </Badge>
                      </div>

                      {!isClosed && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <ContactStrip id={o.id} />
                          <OrderChat orderId={o.id} orderKind="food" role="rider" label={t("rider.chatCustomer")} />
                        </div>
                      )}


                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-background/70 border p-2">
                          <p className="text-[10px] font-bold text-muted-foreground">Pickup</p>
                          <p className="font-bold truncate">{o.restaurants?.name || t("rider.restaurant")}</p>
                          {pickupMap && <a href={pickupMap} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-primary font-bold mt-1"><Navigation className="w-3 h-3" /> {t("rider.map")}</a>}
                        </div>
                        <div className="rounded-lg bg-background/70 border p-2">
                          <p className="text-[10px] font-bold text-muted-foreground">Dropoff</p>
                          <p className="truncate">{o.delivery_address || t("rider.noAddress")}</p>
                          {dropoffMap && <a href={dropoffMap} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-primary font-bold mt-1"><Navigation className="w-3 h-3" /> {t("rider.map")}</a>}
                        </div>
                      </div>

                      {o.order_items?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {o.order_items.map((item: any) => (
                            <Badge key={item.id} variant="secondary" className="text-[10px] font-normal">{item.name} ×{item.quantity}</Badge>
                          ))}
                        </div>
                      )}

                      {!isClosed && (
                        <div className="grid grid-cols-4 gap-1 text-center text-[10px] font-bold">
                          {[
                            { k: "arrived_pickup", label: "ہوٹل پہنچا", done: !!o.rider_arrived_at },
                            { k: "picked", label: "اٹھا لیا", done: o.status === "delivering" || !!o.picked_up_at },
                            { k: "arrived_customer", label: "کسٹمر پاس", done: !!o.arrived_customer_at },
                            { k: "delivered", label: "مکمل", done: false },
                          ].map((s, i) => (
                            <div key={s.k} className={`rounded-md border px-1 py-1.5 ${s.done ? "bg-primary text-primary-foreground border-primary" : "bg-background/70 text-muted-foreground"}`}>
                              {i + 1}. {s.label}
                            </div>
                          ))}
                        </div>
                      )}
                      {!isClosed && !o.rider_arrived_at && o.status !== "delivering" && (
                        <Button size="sm" variant="outline" className="w-full h-9 text-xs font-extrabold" onClick={() => markStep(o, "arrived_pickup")}>📍 میں ہوٹل پہنچ گیا</Button>
                      )}
                      {o.status === "delivering" && !o.arrived_customer_at && (
                        <Button size="sm" variant="outline" className="w-full h-9 text-xs font-extrabold" onClick={() => markStep(o, "arrived_customer")}>🏠 کسٹمر کے دروازے پر پہنچ گیا</Button>
                      )}
                      {o.status === "delivering" && (
                        <div className="space-y-1.5">
                          <label className="flex h-9 w-full cursor-pointer items-center justify-center rounded-md border border-dashed text-[11px] font-bold text-muted-foreground hover:bg-muted">
                            {o.delivery_proof_path ? t("rider.proofChange") : t("rider.proofAdd")}
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) uploadProof(o, f);
                                e.target.value = "";
                              }}
                            />
                          </label>
                          <Button size="sm" className="w-full h-9 text-xs font-extrabold" onClick={() => markDelivered(o)}>
                            {t("rider.markDelivered")}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Grocery / Bazar */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2"><Package className="w-4 h-4" /> {t("rider.groceryOrders")}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {activeGroceryOrders.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">{t("rider.noGroceryAssigned")}</p>
            ) : (
              <div className="space-y-2.5">
                {activeGroceryOrders.map((o) => {
                  const isClosed = ["delivered", "completed", "cancelled"].includes(o.status);
                  const dropoff = mapLink(o.delivery_address, o.delivery_lat, o.delivery_lng);
                  const items = Array.isArray(o.items) ? o.items : [];
                  return (
                    <div key={`${o._table}-${o.id}`} className="rounded-xl border bg-secondary/20 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div>
                          <p className="font-mono text-[10px] text-muted-foreground">#{o.id.slice(0, 8)}</p>
                          <p className="font-extrabold">Rs {o.total_amount ?? "—"}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px]">{o._label}</Badge>
                          <Badge className={isClosed ? "bg-success text-success-foreground" : "bg-primary text-primary-foreground"}>{o.status}</Badge>
                        </div>
                      </div>

                      {!isClosed && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <ContactStrip id={o.id} />
                          <OrderChat
                            orderId={o.id}
                            orderKind={o._table === "grocery_list_orders" ? "grocery_list" : "grocery"}
                            role="rider"
                            label={t("rider.chatCustomer")}
                          />
                        </div>
                      )}


                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <p>🏪 {o.grocery_stores?.name || t("rider.store")}</p>
                        <p>📍 {o.delivery_address || t("rider.noAddress")}</p>
                        <p>💰 {t("rider.deliveryFeeNote")}: Rs {o.delivery_fee || 0}</p>
                      </div>

                      {items.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {items.map((i: any, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-[10px] font-normal">{i.name} ×{i.quantity ?? 1}</Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-2 flex-wrap">
                        {dropoff && (
                          <a href={dropoff} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-primary font-bold">
                            <Navigation className="w-3 h-3" /> {t("rider.map")}
                          </a>
                        )}
                        {!isClosed && (
                          <Button size="sm" className="h-8 text-xs ml-auto" onClick={() => markGroceryDelivered(o)}>{t("rider.markDelivered")}</Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-3 space-y-3">
            <div className="rounded-xl border bg-card p-3 space-y-2">
              <p className="text-xs font-extrabold">{t("rider.historyDay")}</p>
              <div className="grid grid-cols-4 gap-1">
                {([['today', t("rider.today")], ['yesterday', t("rider.yesterday")], ['week', t("rider.sevenDays")], ['custom', t("rider.customDate")]] as const).map(([value, label]) => (
                  <Button key={value} size="sm" variant={dateFilter === value ? "default" : "outline"} className="h-8 px-1 text-[11px]" onClick={() => setDateFilter(value)}>{label}</Button>
                ))}
              </div>
              {dateFilter === "custom" && <input aria-label={t("rider.customDate")} type="date" value={customDate} onChange={(event) => setCustomDate(event.target.value)} className="h-9 w-full rounded-md border bg-background px-3 text-xs" />}
            </div>

            <Card>
              <button className="flex w-full items-center justify-between p-4 text-right" onClick={() => setShowCompleted((open) => !open)} aria-expanded={showCompleted}>
                <span className="text-sm font-extrabold">{t("rider.completedOrders")} — {completedOrders.length}</span>
                {showCompleted ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {showCompleted && (
                <CardContent className="space-y-2 pt-0">
                  {completedOrders.length === 0 ? <p className="py-4 text-center text-xs text-muted-foreground">{t("rider.noCompleted")}</p> : completedOrders.map((order) => (
                    <div key={`${order._table || 'food'}-${order.id}`} className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs">
                      <div><p className="font-bold">#{order.id.slice(0, 8)} · {order._historyLabel}</p><p className="text-[10px] text-muted-foreground">{new Date(order.created_at).toLocaleString("ur-PK")}</p></div>
                      <div className="text-left"><Badge variant={order.status === "cancelled" ? "destructive" : "secondary"}>{STATUS_KEY[order.status] ? t(STATUS_KEY[order.status] as any) : order.status}</Badge><p className="mt-1 font-bold">Rs {order.total_amount ?? "—"}</p></div>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>

            {user && <RiderOfferHistory riderId={user.id} />}
          </TabsContent>

          <TabsContent value="performance" className="mt-3 space-y-3">
            {user && <RiderLevelShifts riderId={user.id} />}
            <RiderHotspots />
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: t("rider.todayDeliveries"), value: summary?.today_deliveries ?? 0, cls: "text-foreground" },
                { label: t("rider.todayEarnings"), value: `Rs ${Math.round(Number(summary?.today_earnings ?? 0))}`, cls: "text-primary" },
                { label: t("rider.totalEarnings"), value: `Rs ${Math.round(Number(summary?.total_earnings ?? 0))}`, cls: "text-success" },
                { label: t("rider.cashDue"), value: `Rs ${Math.round(cashDue)}`, cls: "text-destructive" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border bg-card px-1.5 py-2.5 text-center">
                  <p className="text-[9px] text-muted-foreground leading-tight">{s.label}</p>
                  <p className={`text-sm font-extrabold ${s.cls}`}>{s.value}</p>
                </div>
              ))}
            </div>
            <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
              {t("rider.remitNote")}
            </p>
            {Number(summary?.pending_remit ?? 0) > 0 && (
              <p className="text-[11px] text-warning font-bold text-center">
                Rs {Math.round(Number(summary.pending_remit))} {t("rider.pendingRemit")}
              </p>
            )}

            <Button variant="outline" className="w-full h-11 rounded-xl font-extrabold" onClick={() => navigate("/rider-payments")}>
              <Wallet className="w-4 h-4 mr-1.5" /> {t("rider.paymentsButton")}
            </Button>

            {user && <RiderScore riderId={user.id} />}
            {user && <RiderInsights riderId={user.id} />}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default RiderDashboard;
