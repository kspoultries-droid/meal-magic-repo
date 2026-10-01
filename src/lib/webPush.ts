import { supabase } from "@/integrations/supabase/client";

// Firebase web config is public by design (shipped in every web bundle).
const env = import.meta.env;
const appId = (env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_APP_ID as string | undefined) || "1:450491297061:web:3b71c00c16c1dedcf9becc";
const vapidKey = (env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_VAPID_KEY as string | undefined) || "BKbeDgQNv9hBk6KqlEph1E2Hj84NhYnoaXpobrgjEmHyfgkpE1OWzkq580lk_O9IW3agjQbEa8wLYZvw4oIqqYw";
const config = {
  apiKey: (env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_WEB_API_KEY as string | undefined) || "AIzaSyCzyXXgpxDIGUBrkHQZpCfcmFAJXAXutd4",
  projectId: (env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_PROJECT_ID as string | undefined) || "easy-life-a0ce1",
  appId,
  messagingSenderId: appId.split(":")[1] ?? "",
};

export type WebPushResult = "registered" | "not-configured" | "unsupported" | "open-in-new-tab" | "denied";

function waitForActive(reg: ServiceWorkerRegistration, timeoutMs = 15000): Promise<void> {
  if (reg.active) return Promise.resolve();
  const sw = reg.installing || reg.waiting;
  if (!sw) return navigator.serviceWorker.ready.then(() => undefined);
  return new Promise((resolve) => {
    const done = () => { clearTimeout(t); resolve(); };
    const t = setTimeout(done, timeoutMs);
    sw.addEventListener("statechange", () => { if (sw.state === "activated" || reg.active) done(); });
  });
}

/** Registers this browser for background push and saves the token. Call from a click. */
export async function enableWebPush(userId: string): Promise<WebPushResult> {
  if (!config.apiKey || !config.projectId || !appId || !vapidKey || !config.messagingSenderId) return "not-configured";
  const { isSupported, getMessaging, getToken } = await import("firebase/messaging");
  const { initializeApp, getApps } = await import("firebase/app");
  if (!("Notification" in window) || !(await isSupported())) return "unsupported";
  if (window.top !== window.self) return "open-in-new-tab";
  const perm = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (perm !== "granted") return "denied";
  const qs = new URLSearchParams(config as Record<string, string>).toString();
  const reg = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${qs}`, { scope: "/firebase-cloud-messaging-push-scope" });
  // Pehli baar worker abhi install ho raha hota hai — active hone se pehle subscribe fail hota hai
  await waitForActive(reg);
  const app = getApps()[0] || initializeApp(config as any);
  const messaging = getMessaging(app);
  let token: string;
  try {
    token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: reg });
  } catch (e) {
    console.warn("getToken retry", e);
    await new Promise((r) => setTimeout(r, 1500));
    token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: reg });
  }
  if (!token) return "denied";
  void userId;
  // Server-side RPC: same phone par account badalne par token naye user ko mil jata hai
  const { error } = await (supabase as any).rpc("register_device_token", { _token: token, _platform: "web" });
  if (error) throw new Error(`device token save failed: ${error.message}`);
  return "registered";
}

export const isWebPushConfigured = () =>
  Boolean(config.apiKey && config.projectId && appId && vapidKey && config.messagingSenderId);
