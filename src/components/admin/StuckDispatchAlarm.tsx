import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

const ACK_KEY = "admin-stuck-ack";
const readAck = (): string[] => { try { return JSON.parse(localStorage.getItem(ACK_KEY) || "[]"); } catch { return []; } };

const beep = () => {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.35, 0.7].forEach((t) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.4, ctx.currentTime + t);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.25);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch { /* audio blocked until first tap */ }
  try { navigator.vibrate?.([300, 150, 300]); } catch { /* noop */ }
};

/** Persistent, repeating alarm for food orders the auto-dispatcher could not assign. */
const StuckDispatchAlarm = ({ onOpen }: { onOpen?: () => void }) => {
  const [stuck, setStuck] = useState<{ id: string; total_amount: number }[]>([]);
  const [ack, setAck] = useState<string[]>(readAck);
  const notified = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data } = await supabase.from("orders").select("id,total_amount")
      .eq("dispatch_state", "stuck").is("rider_id", null)
      .in("status", ["confirmed", "preparing", "ready"]).gte("created_at", since).limit(20);
    setStuck((data as any) || []);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    const ch = supabase.channel(`stuck-alarm-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, () => load())
      .subscribe();
    return () => { clearInterval(t); supabase.removeChannel(ch); };
  }, [load]);

  const active = stuck.filter((o) => !ack.includes(o.id));

  useEffect(() => {
    if (!active.length) return;
    active.forEach((o) => {
      if (notified.current.has(o.id)) return;
      notified.current.add(o.id);
      try {
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("رائیڈر نہیں ملا — فوری توجہ", { body: `آرڈر #${o.id.slice(0, 8)} خود تفویض کریں`, requireInteraction: true, tag: `stuck-${o.id}` });
        }
      } catch { /* noop */ }
    });
    beep();
    const t = setInterval(beep, 20000);
    return () => clearInterval(t);
  }, [active.map((o) => o.id).join()]);

  if (!active.length) return null;
  const acknowledge = () => {
    const next = [...ack, ...active.map((o) => o.id)].slice(-200);
    setAck(next); localStorage.setItem(ACK_KEY, JSON.stringify(next));
  };

  return (
    <div role="alert" className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-2 bg-destructive px-3 py-2.5 text-destructive-foreground shadow-lg animate-pulse">
      <div className="flex items-center gap-2 text-sm font-bold">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        {active.length} آرڈر کو کوئی رائیڈر نہیں ملا — خود تفویض کریں
      </div>
      <div className="flex gap-1.5">
        <Button size="sm" variant="secondary" onClick={() => { onOpen?.(); }}>آرڈر دیکھیں</Button>
        <Button size="sm" variant="outline" className="border-destructive-foreground/50 bg-transparent text-destructive-foreground" onClick={acknowledge}>دیکھ لیا</Button>
      </div>
    </div>
  );
};

export default StuckDispatchAlarm;
