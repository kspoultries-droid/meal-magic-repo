import { useCallback, useRef, useEffect, useState } from "react";

/**
 * Rings a short bell (max 3 times) and shows a banner that auto-dismisses.
 */
export const useNewOrderAlert = ({ persistent = false }: { persistent?: boolean } = {}) => {
  const [newOrderCount, setNewOrderCount] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ringsRef = useRef(0);
  const pendingRef = useRef<Set<string>>(new Set());
  const [soundReady, setSoundReady] = useState(false);

  const playBell = useCallback(() => {
    try {
      const ctx = audioContextRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;
      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.5, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      if (ctx.state !== "running") return;
      const now = ctx.currentTime;
      playTone(880, now, 0.15);
      playTone(1100, now + 0.18, 0.15);
      playTone(880, now + 0.36, 0.2);
    } catch {}
  }, []);

  const clearTimers = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (autoDismissRef.current) { clearTimeout(autoDismissRef.current); autoDismissRef.current = null; }
  }, []);

  const enableSound = useCallback(async () => {
    try {
      const ctx = audioContextRef.current || new AudioContext();
      audioContextRef.current = ctx;
      await ctx.resume();
      setSoundReady(ctx.state === "running");
      playBell();
      if (typeof Notification !== "undefined" && Notification.permission === "default") await Notification.requestPermission();
    } catch { setSoundReady(false); }
  }, [playBell]);

  const dismissAlert = useCallback(() => {
    setNewOrderCount(0);
    ringsRef.current = 0;
    clearTimers();
  }, [clearTimers]);

  const triggerAlert = useCallback((message?: string) => {
    setNewOrderCount((c) => c + 1);
    playBell();
    ringsRef.current = 1;

    // Native OS notification (works even when tab is in background)
    try {
      if (typeof Notification !== "undefined") {
        if (Notification.permission === "granted") {
          new Notification("EasyLife", { body: message || "نیا آرڈر آیا ہے!", icon: "/pwa-192x192.png" });
        }
      }
    } catch {}


    clearTimers();
    // Ring max 3 times total (once now + 2 more)
    intervalRef.current = setInterval(() => {
      ringsRef.current += 1;
      if (!persistent && ringsRef.current > 3) {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
        return;
      }
      playBell();
    }, persistent ? 15000 : 3000);
    // Auto-dismiss banner after 15s
    if (!persistent) autoDismissRef.current = setTimeout(() => dismissAlert(), 15000);
  }, [playBell, dismissAlert, clearTimers, persistent]);

  const syncPendingOrders = useCallback((ids: string[]) => {
    const next = new Set(ids);
    const fresh = ids.some(id => !pendingRef.current.has(id));
    pendingRef.current = next;
    if (!next.size) { dismissAlert(); return; }
    if (fresh) { triggerAlert(); setNewOrderCount(next.size); }
    else setNewOrderCount(count => count ? next.size : 0);
  }, [dismissAlert, triggerAlert]);

  useEffect(() => () => { clearTimers(); void audioContextRef.current?.close(); }, [clearTimers]);

  return { newOrderCount, triggerAlert, dismissAlert, syncPendingOrders, enableSound, soundReady };
};
