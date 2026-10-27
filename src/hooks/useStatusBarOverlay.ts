import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

/** Lets a page draw edge-to-edge under the phone status bar (Android app only); restores on leave. */
export function useStatusBarOverlay() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable("StatusBar")) return;
    let cancelled = false;
    import("@capacitor/status-bar").then(({ StatusBar, Style }) => {
      if (cancelled) return;
      StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    });
    return () => {
      cancelled = true;
      import("@capacitor/status-bar").then(({ StatusBar }) => StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {}));
    };
  }, []);
}
