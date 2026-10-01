import { supabase } from "@/integrations/supabase/client";

const env = import.meta.env;
const appId = env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_APP_ID as string | undefined;
const vapidKey = env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_VAPID_KEY as string | undefined;
const config = {
  apiKey: env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_WEB_API_KEY as string | undefined,
  projectId: env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_PROJECT_ID as string | undefined,
  appId,
  messagingSenderId: appId?.split(":")[1] ?? "",
};

export type WebPushResult = "registered" | "not-configured" | "unsupported" | "open-in-new-tab" | "denied";

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
  const app = getApps()[0] || initializeApp(config as any);
  const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: reg });
  if (!token) return "denied";
  await (supabase as any).from("device_tokens").upsert(
    { user_id: userId, token, platform: "web", updated_at: new Date().toISOString() },
    { onConflict: "token" },
  );
  return "registered";
}
