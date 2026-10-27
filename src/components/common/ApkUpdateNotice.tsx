import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { APK_DOWNLOAD_URL, APK_RELEASE_API, hasApkUpdate, parseApkRelease, type ApkRelease } from "@/lib/apkUpdate";

export function ApkUpdateNotice() {
  const [release, setRelease] = useState<ApkRelease | null>(null);
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return;
    let disposed = false;
    let lastCheck = 0;
    let checking = false;
    let dismissedBuild = 0;
    let controller: AbortController | undefined;
    const check = async () => {
      if (disposed || checking || document.visibilityState === "hidden" || Date.now() - lastCheck < 60 * 60 * 1000) return;
      checking = true;
      lastCheck = Date.now();
      controller = new AbortController();
      const timeout = window.setTimeout(() => controller?.abort(), 10000);
      try {
        // Legacy shipped APKs have code 1 and predate the App plugin.
        let installedBuild = 1;
        if (Capacitor.isPluginAvailable("App")) {
          const { App } = await import("@capacitor/app");
          const info = await App.getInfo();
          installedBuild = Number(info.build);
        }
        const response = await fetch(APK_RELEASE_API, { signal: controller.signal, cache: "no-store", headers: { Accept: "application/vnd.github+json" } });
        if (!response.ok) throw new Error("Release unavailable");
        const latest = parseApkRelease(await response.json());
        if (!disposed && hasApkUpdate(installedBuild, latest) && latest && latest.build !== dismissedBuild) {
          setRelease(latest);
          setOpen(true);
        }
      } catch {
        // Offline/rate-limit failure must never disrupt ordering or force an update.
        lastCheck = Date.now() - 55 * 60 * 1000;
      } finally {
        clearTimeout(timeout);
        checking = false;
      }
    };
    const onDismiss = (event: Event) => { dismissedBuild = (event as CustomEvent<number>).detail; };
    window.addEventListener("easylife:apk-update-dismiss", onDismiss);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("online", check);
    void check();
    return () => {
      disposed = true;
      controller?.abort();
      window.removeEventListener("easylife:apk-update-dismiss", onDismiss);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("online", check);
    };
  }, []);

  const dismiss = () => {
    window.dispatchEvent(new CustomEvent("easylife:apk-update-dismiss", { detail: release?.build }));
    setOpen(false);
  };
  const download = async () => {
    setDownloading(true);
    try {
      if (Capacitor.isPluginAvailable("AppLauncher")) {
        const { AppLauncher } = await import("@capacitor/app-launcher");
        const result = await AppLauncher.openUrl({ url: APK_DOWNLOAD_URL });
        if (!result.completed) throw new Error("Unable to open download");
      } else {
        window.open(APK_DOWNLOAD_URL, "_blank", "noopener,noreferrer");
      }
    } catch {
      toast.error("ڈاؤن لوڈ نہیں کھلا؛ دوبارہ کوشش کریں۔");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={value => { if (!value) dismiss(); }}>
      <DialogContent dir="rtl" className="w-[calc(100%-2rem)] max-w-sm rounded-lg gap-3">
        <RefreshCw className="h-7 w-7 text-primary" />
        <DialogTitle>نیا ورژن دستیاب ہے</DialogTitle>
        <DialogDescription>Easy Life {release?.version} — اپ ڈیٹ ڈاؤن لوڈ کریں، پھر فائل کھول کر Install دبائیں۔</DialogDescription>
        <Button onClick={download} disabled={downloading} className="w-full gap-2">
          <Download className="h-4 w-4" />{downloading ? "کھل رہا ہے…" : "اپ ڈیٹ ڈاؤن لوڈ کریں"}
        </Button>
        <Button variant="ghost" onClick={dismiss} className="w-full">ابھی نہیں</Button>
      </DialogContent>
    </Dialog>
  );
}