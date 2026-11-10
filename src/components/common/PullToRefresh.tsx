import { tr } from "@/lib/i18n/tr";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { RotateCw } from "lucide-react";

export const REFRESH_DISTANCE = 80;

const reloadPage = () => window.location.reload();

export function PullToRefresh({ onRefresh = reloadPage }: { onRefresh?: () => void }) {
  const { pathname } = useLocation();
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (pathname === "/reels" || !window.matchMedia("(pointer: coarse)").matches) return;
    let start: { x: number; y: number } | null = null;
    let pull = 0;
    let busy = false;
    const reset = () => {
      document.removeEventListener("touchmove", move);
      start = null; pull = 0; setDistance(0);
    };
    const begin = (event: TouchEvent) => {
      reset();
      const touch = event.touches[0];
      if (!touch || event.touches.length !== 1 || window.scrollY > 0 || busy) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
      let element = event.target instanceof Element ? event.target : null;
      if (element?.closest("input, textarea, select, video, [contenteditable=true]")) return;
      while (element && element !== document.body) {
        const style = getComputedStyle(element);
        if (/auto|scroll/.test(style.overflowY) && element.scrollHeight > element.clientHeight) return;
        if (/auto|scroll/.test(style.overflowX) && element.scrollWidth > element.clientWidth) return;
        element = element.parentElement;
      }
      start = { x: touch.clientX, y: touch.clientY };
      document.addEventListener("touchmove", move, { passive: false });
    };
    const move = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!start || !touch) return;
      const dy = touch.clientY - start.y;
      if (event.touches.length !== 1 || window.scrollY > 0 || dy < 0 || Math.abs(touch.clientX - start.x) > Math.abs(dy)) {
        reset(); return;
      }
      if (dy < 8) return;
      if (event.cancelable) event.preventDefault();
      pull = Math.min(dy * 0.5, 100);
      setDistance(pull);
    };
    const finish = () => {
      if (pull >= REFRESH_DISTANCE) {
        busy = true;
        setRefreshing(true);
        onRefresh();
      }
      reset();
    };
    document.documentElement.classList.add("pull-refresh-enabled");
    document.addEventListener("touchstart", begin, { passive: true });
    document.addEventListener("touchend", finish);
    document.addEventListener("touchcancel", reset);
    return () => {
      document.documentElement.classList.remove("pull-refresh-enabled");
      document.removeEventListener("touchstart", begin);
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", finish);
      document.removeEventListener("touchcancel", reset);
    };
  }, [pathname, onRefresh]);

  if (distance === 0 && !refreshing) return null;
  return (
    <div role="status" aria-label={tr("Refresh page", "صفحہ تازہ کریں")} className="pointer-events-none fixed inset-x-0 top-[calc(var(--navbar-height)+0.75rem)] z-[60] flex justify-center">
      <span className="flex size-10 items-center justify-center rounded-full border border-border bg-card text-primary shadow-card">
        <RotateCw className={`size-5 ${refreshing ? "animate-spin motion-reduce:animate-none" : distance >= REFRESH_DISTANCE ? "rotate-180" : ""}`} />
      </span>
    </div>
  );
}