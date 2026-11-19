import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { Download, X } from "lucide-react";
import { tr } from "@/lib/i18n/tr";
import { Button } from "@/components/ui/button";

export const APK_URL = "https://github.com/kspoultries-droid/meal-magic-repo/releases/latest/download/EasyLife.apk";
const KEY = "smart_app_banner_dismissed_at";
const HIDE_MS = 3 * 24 * 60 * 60 * 1000;

/** Android browser visitors get a one-tap APK download; hidden inside the native app. */
export const SmartAppBanner = () => {
  const { pathname } = useLocation();
  const [hidden, setHidden] = useState(() => {
    try { return Date.now() - Number(localStorage.getItem(KEY) || 0) < HIDE_MS; } catch { return false; }
  });
  if (hidden || Capacitor.isNativePlatform()) return null;
  if (!/Android/i.test(navigator.userAgent || "")) return null;
  if (["/install", "/qr-poster"].includes(pathname) || pathname.startsWith("/store/")) return null;
  const close = () => { try { localStorage.setItem(KEY, String(Date.now())); } catch { /* ignore */ } setHidden(true); };
  return (
    <div className="mx-2 my-2 flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-xl print:hidden">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-extrabold text-primary-foreground">EL</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{tr("Easy Life app", "Easy Life ایپ")}</p>
        <p className="truncate text-xs text-muted-foreground">{tr("Faster ordering & live tracking", "تیز آرڈر اور لائیو ٹریکنگ")}</p>
      </div>
      <Button asChild size="sm"><a href={APK_URL}><Download className="mr-1 h-4 w-4" />{tr("Get app", "ایپ لیں")}</a></Button>
      <button aria-label={tr("Close", "بند کریں")} onClick={close} className="p-1 text-muted-foreground"><X className="h-4 w-4" /></button>
    </div>
  );
};
