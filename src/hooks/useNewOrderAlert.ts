import { useCallback, useRef, useEffect, useState } from "react";

/**
 * Rings a short bell (max 3 times) and shows a banner that auto-dismisses.
 */
export const useNewOrderAlert = () => {
  const [newOrderCount, setNewOrderCount] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ringsRef = useRef(0);

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
      const now = ctx.currentTime;
      playTone(880, now, 0.15);
      playTone(1100, now + 0.18, 0.15);
      playTone(880, now + 0.36, 0.2);
    } catch {}
  }, []);

  const clearTimers = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (autoDismissRef.current) { clearTimeout(autoDismissRef.current); autoDismissRef.current = null; }
  };

  const dismissAlert = useCallback(() => {
    setNewOrderCount(0);
    ringsRef.current = 0;
    clearTimers();
  }, []);

  const triggerAlert = useCallback(() => {
    setNewOrderCount((c) => c + 1);
    playBell();
    ringsRef.current = 1;

    clearTimers();
    // Ring max 3 times total (once now + 2 more)
    intervalRef.current = setInterval(() => {
      ringsRef.current += 1;
      if (ringsRef.current > 3) {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
        return;
      }
      playBell();
    }, 3000);
    // Auto-dismiss banner after 15s
    autoDismissRef.current = setTimeout(() => dismissAlert(), 15000);
  }, [playBell, dismissAlert]);

  useEffect(() => () => clearTimers(), []);

  return { newOrderCount, triggerAlert, dismissAlert };
};
