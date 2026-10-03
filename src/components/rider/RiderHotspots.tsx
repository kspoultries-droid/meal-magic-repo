import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Spot = { restaurant_name: string; address: string | null; lat: number; lng: number; orders_2h: number; orders_today: number };

export default function RiderHotspots() {
  const [spots, setSpots] = useState<Spot[]>([]);
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.rpc("rider_hotspots" as any);
      setSpots(((data as any) ?? []) as Spot[]);
    };
    load();
    const t = setInterval(load, 120000);
    return () => clearInterval(t);
  }, []);

  const max = Math.max(1, ...spots.map((s) => Number(s.orders_2h)));
  return (
    <div className="rounded-xl border bg-card p-3 space-y-2" dir="rtl">
      <div className="font-extrabold">🔥 رش والے علاقے</div>
      <p className="text-xs text-muted-foreground">پچھلے 2 گھنٹوں میں جہاں سے زیادہ آرڈر آئے — وہاں کے قریب رہیں تو جلدی آرڈر ملے گا۔</p>
      {spots.length === 0 && <p className="text-sm text-muted-foreground">آج ابھی کوئی رش نہیں۔</p>}
      {spots.map((s, i) => {
        const hot = Number(s.orders_2h) / max;
        return (
          <a key={i} target="_blank" rel="noreferrer"
            href={`https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`}
            className="flex items-center justify-between gap-2 rounded-lg border p-2">
            <div className="min-w-0">
              <div className="font-bold text-sm truncate">{s.restaurant_name}</div>
              <div className="text-[11px] text-muted-foreground truncate">{s.address}</div>
            </div>
            <div className="text-left shrink-0">
              <div className={`text-sm font-extrabold ${hot > 0.6 ? "text-destructive" : hot > 0.3 ? "text-warning" : "text-primary"}`}>
                {s.orders_2h} آرڈر
              </div>
              <div className="text-[10px] text-muted-foreground">آج {s.orders_today} · نقشہ ↗</div>
            </div>
          </a>
        );
      })}
    </div>
  );
}
