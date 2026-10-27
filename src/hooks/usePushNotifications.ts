import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { saveNativePushToken } from "@/lib/nativePush";

export type PushState = "unsupported" | "idle" | "granted" | "denied";

/**
 * Native (Capacitor) push notifications.
 * Web build par kuch nahi karta — sirf Android/iOS native app me chalta hai.
 */
export const usePushNotifications = () => {
  const { user } = useAuth();
  const [state, setState] = useState<PushState>("idle");
  const isNative = Capacitor.isNativePlatform();

  const saveToken = useCallback(
    async (token: string) => {
      if (!user) return;
      await saveNativePushToken(token);
    },
    [user?.id]
  );

  const register = useCallback(async () => {
    if (!isNative) {
      setState("unsupported");
      return "unsupported" as const;
    }
    const { PushNotifications } = await import("@capacitor/push-notifications");
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive !== "granted") {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== "granted") {
      setState("denied");
      return "denied" as const;
    }
    await PushNotifications.register();
    setState("granted");
    return "granted" as const;
  }, [isNative]);

  useEffect(() => {
    if (!isNative || !user) return;
    let cleanup: (() => void) | undefined;
    let disposed = false;

    (async () => {
      const { PushNotifications } = await import("@capacitor/push-notifications");

      const listeners = await Promise.all([
        PushNotifications.addListener("registration", (t) => {
          void saveToken(t.value).catch(() => {
            if (!disposed) toast.error("فون کی اطلاعات رجسٹر نہیں ہوئیں — گھنٹی سے دوبارہ چالو کریں");
          });
        }),
        PushNotifications.addListener("registrationError", (err) => {
          console.error("Push registration error:", err);
        }),
        PushNotifications.addListener("pushNotificationReceived", (n) => {
          toast.info(n.title || "نیا نوٹیفکیشن", { description: n.body || undefined });
        }),
        PushNotifications.addListener("pushNotificationActionPerformed", (a) => {
          const path = (a.notification.data as any)?.path;
          if (typeof path === "string" && path.startsWith("/")) window.location.assign(path);
        }),
      ]);
      if (disposed) { listeners.forEach(listener => void listener.remove()); return; }
      cleanup = () => listeners.forEach((l) => void l.remove());

      try {
        await PushNotifications.createChannel({ id: "orders", name: "Orders", importance: 5, sound: "default", vibration: true });
        await PushNotifications.createChannel({ id: "default", name: "General", importance: 3 });
      } catch { /* iOS */ }
      const perm = await PushNotifications.checkPermissions();
      if (perm.receive === "granted") {
        await PushNotifications.register();
        setState("granted");
      }

    })().catch(() => { if (!disposed) setState("idle"); });

    return () => { disposed = true; cleanup?.(); };
  }, [isNative, user?.id, saveToken]);

  return { isNative, state, register };
};

export default usePushNotifications;
