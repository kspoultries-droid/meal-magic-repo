import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

export async function saveNativePushToken(token: string) {
  const { error } = await supabase.rpc("register_device_token", { _token: token, _platform: Capacitor.getPlatform() });
  if (error) throw new Error("فون کی اطلاع رجسٹر نہیں ہوئی؛ دوبارہ کوشش کریں");
}

/** Resolve only after the native token is stored, not merely permission granted. */
export async function enableNativePush(): Promise<"registered" | "denied" | "unsupported"> {
  if (!Capacitor.isNativePlatform()) return "unsupported";
  const { PushNotifications } = await import("@capacitor/push-notifications");
  let permission = await PushNotifications.checkPermissions();
  if (permission.receive !== "granted") permission = await PushNotifications.requestPermissions();
  if (permission.receive !== "granted") return "denied";
  await PushNotifications.createChannel({ id: "orders", name: "آرڈر اور رائیڈر آفر", importance: 5, sound: "default", vibration: true }).catch(() => undefined);
  let complete: (value: "registered") => void = () => undefined;
  let fail: (error: Error) => void = () => undefined;
  const result = new Promise<"registered">((resolve, reject) => { complete = resolve; fail = reject; });
  const listeners = await Promise.all([
    PushNotifications.addListener("registration", ({ value }) => {
      void saveNativePushToken(value).then(() => complete("registered")).catch(fail);
    }),
    PushNotifications.addListener("registrationError", () => fail(new Error("Android اطلاعات کی ترتیب مکمل نہیں؛ تازہ APK اور Firebase ترتیب چیک کریں"))),
  ]);
  const timer = window.setTimeout(() => fail(new Error("فون رجسٹر ہونے میں دیر ہوئی؛ دوبارہ کوشش کریں")), 20000);
  try { await PushNotifications.register(); return await result; }
  finally { clearTimeout(timer); await Promise.all(listeners.map(listener => listener.remove())); }
}