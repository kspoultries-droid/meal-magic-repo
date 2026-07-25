import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { LogOut, Bike, ArrowLeft, RefreshCw, Wallet, TrendingUp, Package, Navigation, MapPin } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useNewOrderAlert } from "@/hooks/useNewOrderAlert";
import NewOrderBanner from "@/components/NewOrderBanner";

// Haversine distance in km
const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const RiderDashboard = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [hasRole, setHasRole] = useState<boolean | null>(null);
  const [riderData, setRiderData] = useState<any>(null);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [nearbyOrders, setNearbyOrders] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<string>("");
  const { newOrderCount, triggerAlert, dismissAlert } = useNewOrderAlert();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      supabase.rpc("has_role", { _user_id: user.id, _role: "rider" as any })
        .then(({ data }) => setHasRole(!!data));
    }
  }, [user]);

  // GPS location tracking
  const updateLocation = useCallback(async (lat: number, lng: number) => {
    if (!user) return;
    setMyLocation({ lat, lng });
    await supabase.from("riders").update({ current_lat: lat, current_lng: lng }).eq("id", user.id);
  }, [user]);

  useEffect(() => {
    if (!hasRole || !user) return;
    if (!navigator.geolocation) {
      setLocationStatus("آپ کا براؤزر لوکیشن سپورٹ نہیں کرتا");
      return;
    }
    setLocationStatus("لوکیشن حاصل ہو رہی ہے...");
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setLocationStatus("");
        updateLocation(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setLocationStatus("لوکیشن اجازت دیں — GPS آن کریں");
        console.error("Geolocation error:", err);
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [hasRole, user, updateLocation]);

  const ensureRiderProfile = async () => {
    if (!user) return null;
    const { data: approvedApp } = await supabase
      .from("partner_applications")
      .select("city_id")
      .eq("user_id", user.id)
      .eq("applicant_type", "rider")
      .eq("status", "approved")
      .order("reviewed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data, error } = await supabase
      .from("riders")
      .insert({ id: user.id, city_id: approvedApp?.city_id || null, is_available: false })
      .select("*")
      .maybeSingle();

    if (error) {
      toast.error("رائیڈر پروفائل نہیں بنی: " + error.message);
      return null;
    }
    return data;
  };

  const fetchData = async (showLoader = true) => {
    if (!user) return;
    if (showLoader) setLoadingData(true);
    const [{ data: rider }, { data: assigned }, { data: available }] = await Promise.all([
      supabase.from("riders").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("orders").select("*, order_items(*), restaurants(name, description, delivery_mode, pickup_address, pickup_lat, pickup_lng)").eq("rider_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("orders").select("*, order_items(*), restaurants!inner(name, description, delivery_mode, pickup_address, pickup_lat, pickup_lng)").in("status", ["confirmed", "preparing", "delivering"]).is("rider_id", null).neq("restaurants.delivery_mode", "self").order("created_at", { ascending: false }).limit(20),

    ]);
    const nextRider = rider || await ensureRiderProfile();
    setRiderData(nextRider);
    setMyOrders(assigned || []);

    // Sort by distance and take nearest 5
    const allAvailable = available || [];
    if (myLocation && allAvailable.length > 0) {
      const withDist = allAvailable.map(o => ({
        ...o,
        _distance: o.delivery_lat && o.delivery_lng
          ? haversineKm(myLocation.lat, myLocation.lng, o.delivery_lat, o.delivery_lng)
          : 9999,
      }));
      withDist.sort((a, b) => a._distance - b._distance);
      setNearbyOrders(withDist.slice(0, 5));
    } else {
      setNearbyOrders(allAvailable.slice(0, 5));
    }
    setLoadingData(false);
  };

  useEffect(() => {
    if (hasRole) fetchData(!riderData);
  }, [hasRole, user, myLocation]);

  // Realtime order updates
  useEffect(() => {
    if (!hasRole || !user) return;
    const channel = supabase
      .channel("rider-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        fetchData();
        if (payload.eventType === 'INSERT') triggerAlert();
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
    fetchData();
  };

  const updateOrderStatus = async (order: any, status: string) => {
    if (order.status !== "delivering" || status !== "delivered") {
      toast.error("رائیڈر صرف assigned delivery کو Delivered کر سکتا ہے");
      return;
    }
    const { error } = await supabase.from("orders").update({ status }).eq("id", order.id);
    if (error) { toast.error(error.message); return; }
    toast.success("سٹیٹس اپڈیٹ ہو گئی");
    fetchData();
  };

  const mapLink = (address?: string | null, lat?: number | null, lng?: number | null) => {
    if (lat && lng) return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    if (address) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    return "";
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

  return (
    <div className="min-h-screen bg-background">
      <NewOrderBanner count={newOrderCount} onDismiss={dismissAlert} label="نیا آرڈر دستیاب! / New order available!" />
      <header className="border-b bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-xl font-bold text-primary">رائیڈر ڈیش بورڈ</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <Button variant="outline" size="sm" onClick={() => { signOut(); navigate("/"); }}>
            <LogOut className="h-4 w-4 mr-1" /> لاگ آؤٹ
          </Button>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Location Status */}
        {locationStatus && (
          <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-warning" />
            <span className="text-sm text-warning">{locationStatus}</span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Bike className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">سٹیٹس</p>
                <div className="flex items-center gap-2">
                  <Switch checked={riderData?.is_available || false} onCheckedChange={toggleAvailability} />
                  <span className="font-bold">{riderData?.is_available ? "آن لائن" : "آف لائن"}</span>
                </div>
                {myLocation && (
                  <p className="text-[10px] text-muted-foreground mt-1">📍 لوکیشن شیئر ہو رہی ہے</p>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">والٹ بیلنس</p>
                <p className="text-xl font-extrabold">Rs {riderData?.wallet_balance || 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">کل آمدنی</p>
                <p className="text-xl font-extrabold">Rs {riderData?.total_earnings || 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Nearby Orders (read-only - admin assigns) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Package className="w-5 h-5" /> قریبی آرڈرز (5 قریب ترین)</CardTitle>
            <Button variant="outline" size="sm" onClick={() => fetchData()}><RefreshCw className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">⚠️ آرڈر ایڈمن تفویض کرے گا — آپ کو اسائن ہونے پر "میرے آرڈرز" میں نظر آئے گا</p>
            {nearbyOrders.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">ابھی کوئی قریبی آرڈر نہیں</p>
            ) : (
              <div className="space-y-3">
                {nearbyOrders.map((o) => (
                  <div key={o.id} className="bg-secondary/30 rounded-xl p-4 border space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8)}</p>
                        <p className="font-bold text-foreground">Rs {o.total_amount}</p>
                        <Badge variant={o.status === 'confirmed' ? 'secondary' : o.status === 'preparing' ? 'outline' : 'default'} className="mt-1 text-[10px]">
                          {o.status === 'confirmed' ? '✅ تصدیق شدہ' : o.status === 'preparing' ? '🍳 تیاری جاری' : '📦 ڈلیوری کے لیے تیار'}
                        </Badge>
                      </div>
                      {o._distance != null && o._distance < 9999 && (
                        <Badge variant="outline" className="text-[10px]">📍 {o._distance.toFixed(1)} km</Badge>
                      )}
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>🏪 Pickup: <span className="font-bold text-foreground">{o.restaurants?.name || "ریسٹورنٹ"}</span>{o.restaurants?.description ? ` — ${o.restaurants.description}` : ""}</p>
                      <p>📍 Dropoff: {o.delivery_address || "پتہ نہیں"}</p>
                    </div>
                    {o.delivery_address && (
                      <a
                        href={mapLink(o.delivery_address, o.delivery_lat, o.delivery_lng)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary font-bold hover:underline"
                      >
                        <Navigation className="w-3 h-3" /> کسٹمر لوکیشن
                      </a>
                    )}
                    {o.order_items?.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {o.order_items.map((item: any) => (
                          <span key={item.id} className="mr-2">{item.name} ×{item.quantity}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Assigned Orders */}
        <Card>
          <CardHeader>
            <CardTitle>میرے آرڈرز</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingData ? <p className="text-muted-foreground">لوڈ ہو رہا ہے...</p> : myOrders.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">ابھی کوئی آرڈر نہیں</p>
            ) : (
              <div className="space-y-3">
                {myOrders.map((o) => {
                  const pickupAddr = o.restaurants?.pickup_address || o.restaurants?.description || "";
                  const pickupMap = mapLink(pickupAddr, o.restaurants?.pickup_lat, o.restaurants?.pickup_lng);
                  const dropoffMap = mapLink(o.delivery_address, o.delivery_lat, o.delivery_lng);
                  const isClosed = ["delivered", "completed", "cancelled"].includes(o.status);
                  return (
                    <div key={o.id} className="rounded-xl border bg-secondary/20 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div>
                          <p className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8)}</p>
                          <p className="font-extrabold text-foreground">Rs {o.total_amount}</p>
                        </div>
                        <Badge className={o.status === "delivered" || o.status === "completed" ? "bg-success text-success-foreground" : o.status === "cancelled" ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"}>
                          {o.status === "confirmed" ? "ریسٹورنٹ نے قبول کیا" : o.status === "preparing" ? "تیار ہو رہا ہے" : o.status === "delivering" ? "ڈلیوری جاری" : o.status === "delivered" || o.status === "completed" ? "مکمل" : o.status}
                        </Badge>
                      </div>

                      <div className="grid gap-2 text-sm">
                        <div className="rounded-lg bg-background/70 border p-3">
                          <p className="text-xs font-bold text-muted-foreground mb-1">Pickup / ریسٹورنٹ</p>
                          <p className="font-bold text-foreground">{o.restaurants?.name || "ریسٹورنٹ"}</p>
                          {pickupAddr && <p className="text-xs text-muted-foreground mt-0.5">{pickupAddr}</p>}
                          {pickupMap && (
                            <a href={pickupMap} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary font-bold hover:underline mt-2">
                              <Navigation className="w-3 h-3" /> Pickup map
                            </a>
                          )}
                        </div>

                        <div className="rounded-lg bg-background/70 border p-3">
                          <p className="text-xs font-bold text-muted-foreground mb-1">Dropoff / کسٹمر</p>
                          <p className="text-foreground">{o.delivery_address || "پتہ نہیں"}</p>
                          {dropoffMap && (
                            <a href={dropoffMap} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary font-bold hover:underline mt-2">
                              <Navigation className="w-3 h-3" /> Customer map
                            </a>
                          )}
                        </div>
                      </div>

                      {o.order_items?.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {o.order_items.map((item: any) => (
                            <span key={item.id} className="mr-2">{item.name} ×{item.quantity}</span>
                          ))}
                        </div>
                      )}

                      {o.status === "delivering" && (
                        <Button size="sm" className="w-full" onClick={() => updateOrderStatus(o, "delivered")}>
                          کسٹمر کو ڈلیور ہو گیا ✅
                        </Button>
                      )}
                      {!isClosed && o.status !== "delivering" && (
                        <p className="text-[11px] text-muted-foreground">ریسٹورنٹ “بھیجا” کرے گا تو Delivered بٹن یہاں فعال ہو گا۔</p>
                      )}
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
