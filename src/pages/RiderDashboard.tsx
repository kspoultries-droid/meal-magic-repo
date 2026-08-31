import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { LogOut, Bike, ArrowLeft, RefreshCw, Package, Navigation, MapPin, Phone, MessageCircle, Wallet } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useNewOrderAlert } from "@/hooks/useNewOrderAlert";
import NewOrderBanner from "@/components/NewOrderBanner";
import RiderOfferCard from "@/components/rider/RiderOfferCard";


const vibrate = (pattern: number[] = [300, 120, 300, 120, 500]) => {
  try { navigator.vibrate?.(pattern); } catch { /* not supported */ }
};

const STATUS_LABEL: Record<string, string> = {
  confirmed: "ریسٹورنٹ نے قبول کیا",
  preparing: "تیار ہو رہا ہے",
  delivering: "ڈلیوری جاری",
  delivered: "مکمل",
  completed: "مکمل",
  cancelled: "منسوخ",
};

const RiderDashboard = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [hasRole, setHasRole] = useState<boolean | null>(null);
  const [riderData, setRiderData] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [groceryOrders, setGroceryOrders] = useState<any[]>([]);
  const [contacts, setContacts] = useState<Record<string, { name: string | null; phone: string | null }>>({});
  const [loadingData, setLoadingData] = useState(true);
  const [locationOk, setLocationOk] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string>("");
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

  const updateLocation = useCallback(async (lat: number, lng: number) => {
    if (!user) return;
    setLocationOk(true);
    await supabase.from("riders").update({ current_lat: lat, current_lng: lng }).eq("id", user.id);
  }, [user]);

  useEffect(() => {
    if (!hasRole || !user) return;
    if (!navigator.geolocation) { setLocationStatus("آپ کا براؤزر لوکیشن سپورٹ نہیں کرتا"); return; }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => { setLocationStatus(""); updateLocation(pos.coords.latitude, pos.coords.longitude); },
      () => setLocationStatus("لوکیشن اجازت دیں — GPS آن کریں"),
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [hasRole, user, updateLocation]);

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
      ...(gCart || []).map((o: any) => ({ ...o, _table: "grocery_cart_orders" as const, _kind: "grocery_cart", _label: "گروسری کارٹ" })),
      ...(gList || []).map((o: any) => ({ ...o, _table: "grocery_list_orders" as const, _kind: "grocery_list", _label: "لسٹ/فوٹو آرڈر" })),
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
    const { error } = await supabase.from("riders").update({ is_available: !currentRider.is_available }).eq("id", user.id);
    if (error) { toast.error(error.message); return; }
    toast.success(currentRider.is_available ? "آپ آف لائن ہو گئے" : "آپ آن لائن ہو گئے");
    fetchData(false);
  };

  const markDelivered = async (order: any) => {
    if (order.status !== "delivering") { toast.error("ریسٹورنٹ کے 'بھیجا' کرنے کے بعد ہی Delivered ہو گا"); return; }
    const { error } = await supabase.from("orders").update({ status: "delivered" }).eq("id", order.id);
    if (error) { toast.error(error.message); return; }
    toast.success("ڈلیور ہو گیا ✅");
    fetchData(false);
  };

  const markGroceryDelivered = async (order: any) => {
    const { error } = await supabase.from(order._table).update({ status: "delivered" }).eq("id", order.id);
    if (error) { toast.error(error.message); return; }
    toast.success("گروسری آرڈر ڈلیور ہو گیا ✅");
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
          <p className="font-extrabold text-foreground">{c.name || "کسٹمر"}</p>
          {c.phone && <p className="text-muted-foreground font-mono">{c.phone}</p>}
        </div>
        {c.phone && (
          <div className="flex gap-1.5">
            <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-[11px] font-bold">
              <Phone className="w-3 h-3" /> کال
            </a>
            {wa && (
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full bg-success text-success-foreground px-3 py-1.5 text-[11px] font-bold">
                <MessageCircle className="w-3 h-3" /> واٹس ایپ
              </a>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading || hasRole === null) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">لوڈ ہو رہا ہے...</div>;

  if (!hasRole) return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="max-w-md">
        <CardContent className="p-8 text-center">
          <Bike className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold mb-2">آپ رائیڈر نہیں ہیں</h2>
          <p className="text-muted-foreground mb-4">ایڈمن سے رائیڈر کا رول حاصل کریں</p>
          <Button variant="outline" onClick={() => navigate("/")}>واپس جائیں</Button>
        </CardContent>
      </Card>
    </div>
  );

  const cashDue = Number(summary?.cash_due ?? 0);

  return (
    <div className="min-h-screen bg-background pb-8">
      <NewOrderBanner count={newOrderCount} onDismiss={dismissAlert} label="نیا آرڈر آپ کو اسائن ہوا!" />

      {/* Compact header */}
      <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur px-3 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate("/")}><ArrowLeft className="h-4 w-4" /></Button>
          <div className="min-w-0">
            <h1 className="text-sm font-extrabold text-primary leading-tight">رائیڈر ڈیش بورڈ</h1>
            <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <Switch checked={riderData?.is_available || false} onCheckedChange={toggleAvailability} />
            <span className="text-[11px] font-bold">{riderData?.is_available ? "آن لائن" : "آف لائن"}</span>
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
          </div>
        ) : locationOk ? (
          <p className="text-[10px] text-muted-foreground text-center">📍 لوکیشن شیئر ہو رہی ہے</p>
        ) : null}

        {user && <RiderOfferCard riderId={user.id} onChanged={() => fetchData(false)} />}

        {/* Compact stats strip */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "آج ڈلیوری", value: summary?.today_deliveries ?? 0, cls: "text-foreground" },
            { label: "آج کی کمائی", value: `Rs ${Math.round(Number(summary?.today_earnings ?? 0))}`, cls: "text-primary" },
            { label: "کل کمائی", value: `Rs ${Math.round(Number(summary?.total_earnings ?? 0))}`, cls: "text-success" },
            { label: "جمع کرانی رقم", value: `Rs ${Math.round(cashDue)}`, cls: "text-destructive" },

          ].map((s) => (
            <div key={s.label} className="rounded-xl border bg-card px-1.5 py-2.5 text-center">
              <p className="text-[9px] text-muted-foreground leading-tight">{s.label}</p>
              <p className={`text-sm font-extrabold ${s.cls}`}>{s.value}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
          نوٹ: وصول کی گئی پوری رقم (ڈیلیوری فیس سمیت) EasyLife کو جمع کرانی ہے۔ آپ کی کمائی تنخواہ / فی آرڈر پلان کے مطابق الگ سے ادا کی جاتی ہے۔
        </p>
        {Number(summary?.pending_remit ?? 0) > 0 && (
          <p className="text-[11px] text-warning font-bold text-center">
            Rs {Math.round(Number(summary.pending_remit))} زیرِ تصدیق ہے
          </p>
        )}


        <Button variant="outline" className="w-full h-11 rounded-xl font-extrabold" onClick={() => navigate("/rider-payments")}>
          <Wallet className="w-4 h-4 mr-1.5" /> پیمنٹ اور کمائی — رقم جمع کرائیں
        </Button>

        {/* My assigned food orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <CardTitle className="text-base flex items-center gap-2"><Package className="w-4 h-4" /> میرے آرڈرز</CardTitle>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => fetchData(false)}><RefreshCw className="h-3.5 w-3.5" /></Button>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingData ? <p className="text-sm text-muted-foreground">لوڈ ہو رہا ہے...</p> : myOrders.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">ابھی کوئی آرڈر اسائن نہیں ہوا</p>
            ) : (
              <div className="space-y-2.5">
                {myOrders.map((o) => {
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
                          {STATUS_LABEL[o.status] || o.status}
                        </Badge>
                      </div>

                      {!isClosed && <ContactStrip id={o.id} />}

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-background/70 border p-2">
                          <p className="text-[10px] font-bold text-muted-foreground">Pickup</p>
                          <p className="font-bold truncate">{o.restaurants?.name || "ریسٹورنٹ"}</p>
                          {pickupMap && <a href={pickupMap} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-primary font-bold mt-1"><Navigation className="w-3 h-3" /> نقشہ</a>}
                        </div>
                        <div className="rounded-lg bg-background/70 border p-2">
                          <p className="text-[10px] font-bold text-muted-foreground">Dropoff</p>
                          <p className="truncate">{o.delivery_address || "پتہ نہیں"}</p>
                          {dropoffMap && <a href={dropoffMap} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-primary font-bold mt-1"><Navigation className="w-3 h-3" /> نقشہ</a>}
                        </div>
                      </div>

                      {o.order_items?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {o.order_items.map((item: any) => (
                            <Badge key={item.id} variant="secondary" className="text-[10px] font-normal">{item.name} ×{item.quantity}</Badge>
                          ))}
                        </div>
                      )}

                      {o.status === "delivering" && (
                        <Button size="sm" className="w-full h-9 text-xs font-extrabold" onClick={() => markDelivered(o)}>
                          ڈلیور ہو گیا ✅
                        </Button>
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
            <CardTitle className="text-base flex items-center gap-2"><Package className="w-4 h-4" /> گروسری / بازار آرڈرز</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {groceryOrders.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">ابھی کوئی گروسری آرڈر اسائن نہیں ہوا</p>
            ) : (
              <div className="space-y-2.5">
                {groceryOrders.map((o) => {
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

                      {!isClosed && <ContactStrip id={o.id} />}

                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <p>🏪 {o.grocery_stores?.name || "اسٹور"}</p>
                        <p>📍 {o.delivery_address || "پتہ نہیں"}</p>
                        <p>💰 ڈلیوری فیس (EasyLife کی): Rs {o.delivery_fee || 0}</p>
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
                            <Navigation className="w-3 h-3" /> نقشہ
                          </a>
                        )}
                        {!isClosed && (
                          <Button size="sm" className="h-8 text-xs ml-auto" onClick={() => markGroceryDelivered(o)}>ڈلیور ہو گیا</Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RiderDashboard;
