import { Capacitor, CapacitorHttp, registerPlugin } from "@capacitor/core";
import type { BackgroundGeolocationPlugin } from "@capacitor-community/background-geolocation";
import { supabase } from "@/integrations/supabase/client";
import type { RiderFix } from "./riderLocation";

const background = registerPlugin<BackgroundGeolocationPlugin>("BackgroundGeolocation");
export const hasNativeRiderLocation = () => Capacitor.getPlatform() === "android" && Capacitor.isPluginAvailable("BackgroundGeolocation");

/** One native watcher replaces, rather than competes with, the browser watcher. */
export async function watchNativeRiderLocation(onFix: (fix: RiderFix) => void, onError: (denied: boolean) => void) {
  const id = await background.addWatcher({
    backgroundTitle: "Easy Life — رائیڈر آن لائن",
    backgroundMessage: "ڈیلیوری کے لیے لوکیشن جاری ہے؛ آف لائن کرنے پر بند ہو جائے گی۔",
    requestPermissions: true,
    stale: false,
    distanceFilter: 0,
  }, (location, error) => {
    if (error) { onError(error.code === "NOT_AUTHORIZED"); return; }
    if (!location || location.time === null) return;
    onFix({ lat: location.latitude, lng: location.longitude, accuracy: location.accuracy, at: location.time });
  });
  return () => background.removeWatcher({ id });
}

/** Native networking avoids Android's background WebView HTTP throttling. */
export async function publishNativeRiderFix(fix: RiderFix): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  const session = data.session;
  if (error || !session) throw new Error("session unavailable");
  const url = import.meta.env.VITE_SUPABASE_URL;
  const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !apiKey) throw new Error("location configuration unavailable");
  const response = await CapacitorHttp.post({
    url: `${url}/rest/v1/rpc/publish_rider_location`,
    headers: { apikey: apiKey, Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
    data: { _lat: fix.lat, _lng: fix.lng, _accuracy: fix.accuracy },
    connectTimeout: 15000,
    readTimeout: 15000,
  });
  if (response.status < 200 || response.status >= 300 || typeof response.data !== "string" || !Number.isFinite(Date.parse(response.data))) {
    throw new Error(`location not saved (${response.status})`);
  }
  return response.data;
}