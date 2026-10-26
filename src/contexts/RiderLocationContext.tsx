import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { shouldPublishFix, validRiderFix, type RiderFix } from "@/lib/riderLocation";

type LocationState = { sharing: boolean; error: string; updatedAt: string | null; retry: () => void };
const Context = createContext<LocationState>({ sharing: false, error: "", updatedAt: null, retry: () => {} });
export const useRiderLocation = () => useContext(Context);

export function RiderLocationProvider({ children }: { children: React.ReactNode }) {
  const { user, isRider } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [state, setState] = useState({ sharing: false, error: "", updatedAt: null as string | null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setEnabled(false);
    if (!user || !isRider) return;
    let disposed = false;
    const refresh = async () => {
      const [rider, ...orders] = await Promise.all([
        supabase.from("riders").select("is_available,is_suspended").eq("id", user.id).maybeSingle(),
        ...(["orders", "grocery_cart_orders", "grocery_list_orders"] as const).map(table =>
          supabase.from(table).select("id").eq("rider_id", user.id).not("status", "in", "(delivered,completed,cancelled,returned_to_store)").limit(1)),
      ]);
      if (!disposed) setEnabled(!!rider.data && !rider.data.is_suspended &&
        (rider.data.is_available || orders.some(result => (result.data?.length ?? 0) > 0)));
    };
    void refresh();
    const channel = supabase.channel(`rider-gps-state-${user.id}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "riders", filter: `id=eq.${user.id}` }, p => {
        if (p.new.is_available !== p.old.is_available || p.new.is_suspended !== p.old.is_suspended) void refresh();
      }).subscribe();
    const timer = window.setInterval(refresh, 30000);
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", visible);
    return () => { disposed = true; clearInterval(timer); document.removeEventListener("visibilitychange", visible); void supabase.removeChannel(channel); };
  }, [user?.id, isRider]);

  useEffect(() => {
    if (!enabled || !user || !isRider) return;
    const heartbeat = () => { if (document.visibilityState === "visible" && navigator.onLine) void supabase.rpc("rider_heartbeat"); };
    heartbeat();
    const timer = window.setInterval(heartbeat, 30000);
    document.addEventListener("visibilitychange", heartbeat);
    window.addEventListener("online", heartbeat);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", heartbeat); window.removeEventListener("online", heartbeat); };
  }, [enabled, user?.id, isRider]);

  useEffect(() => {
    setState({ sharing: false, error: "", updatedAt: null });
    if (!enabled || !user || !isRider) return;
    if (!navigator.geolocation) { setState(s => ({ ...s, error: "اس فون پر GPS دستیاب نہیں" })); return; }
    let disposed = false;
    let busy = false;
    let previous: RiderFix | null = null;
    let watch: number | undefined;
    const options = { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 };
    const failed = (error: GeolocationPositionError) => {
      if (!disposed) setState(s => ({ ...s, sharing: false, error: error.code === 1 ? "GPS کی اجازت بند ہے — فون کی ترتیبات میں لوکیشن کی اجازت دیں" : "تازہ GPS نہیں مل رہا — لوکیشن اور انٹرنیٹ چیک کریں" }));
    };
    const publish = async (pos: GeolocationPosition) => {
      const fix = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, at: pos.timestamp };
      if (disposed || busy) return;
      if (!validRiderFix(fix)) { setState(s => ({ ...s, sharing: false, error: "GPS غیر واضح ہے — بہتر سگنل کا انتظار ہے" })); return; }
      if (!shouldPublishFix(fix, previous)) return;
      busy = true;
      try {
        const { data, error } = await supabase.rpc("publish_rider_location", { _lat: fix.lat, _lng: fix.lng, _accuracy: fix.accuracy });
        if (disposed) return;
        if (error || !data) setState(s => ({ ...s, sharing: false, error: "لوکیشن محفوظ نہیں ہوئی — انٹرنیٹ چیک کریں؛ دوبارہ کوشش جاری ہے" }));
        else { previous = { ...fix, at: Date.now() }; setState({ sharing: true, error: "", updatedAt: data }); }
      } catch {
        if (!disposed) setState(s => ({ ...s, sharing: false, error: "لوکیشن بھیجنے میں رابطہ ٹوٹ گیا" }));
      } finally { busy = false; }
    };
    const acquire = () => { if (document.visibilityState === "visible") navigator.geolocation.getCurrentPosition(publish, failed, options); };
    const start = () => { watch = navigator.geolocation.watchPosition(publish, failed, options); acquire(); };
    const visible = () => {
      if (watch !== undefined) navigator.geolocation.clearWatch(watch);
      watch = undefined;
      if (document.visibilityState === "visible") { previous = null; start(); }
      else setState(s => ({ ...s, sharing: false }));
    };
    if (document.visibilityState === "visible") start();
    const timer = window.setInterval(acquire, 15000);
    document.addEventListener("visibilitychange", visible);
    return () => { disposed = true; if (watch !== undefined) navigator.geolocation.clearWatch(watch); clearInterval(timer); document.removeEventListener("visibilitychange", visible); };
  }, [enabled, user?.id, isRider, attempt]);

  return <Context.Provider value={{ ...state, retry: () => setAttempt(a => a + 1) }}>{children}</Context.Provider>;
}