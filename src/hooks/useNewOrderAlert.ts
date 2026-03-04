import { useCallback, useRef, useEffect, useState } from "react";

/**
 * Hook that plays a repeating bell sound and tracks new order count.
 * Call `triggerAlert()` when a new order arrives.
 * Call `dismissAlert()` to stop the bell and clear the banner.
 */
export const useNewOrderAlert = () => {
  const [newOrderCount, setNewOrderCount] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const playBell = useCallback(() => {
    try {
      const ctx = audioContextRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;

      // Two-tone bell: high then low
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
    } catch {
      // AudioContext not supported
    }
  }, []);

  const triggerAlert = useCallback(() => {
    setNewOrderCount((c) => c + 1);
    playBell();

    // Repeat bell every 3 seconds
    if (!intervalRef.current) {
      intervalRef.current = setInterval(() => {
        playBell();
      }, 3000);
    }
  }, [playBell]);

  const dismissAlert = useCallback(() => {
    setNewOrderCount(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { newOrderCount, triggerAlert, dismissAlert };
};
