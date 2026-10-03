import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

type Info = {
  level: number; score: number; week_deliveries: number; total_deliveries: number;
  book_days_ahead: number; bonus_tiers: { target: number; amount: number }[];
};
const SLOTS = [
  { id: "morning", label: "صبح 8–12" },
  { id: "afternoon", label: "دوپہر 12–4" },
  { id: "evening", label: "شام 4–8" },
  { id: "night", label: "رات 8–12" },
];
const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function RiderLevelShifts({ riderId }: { riderId: string }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [shifts, setShifts] = useState<{ id: string; shift_date: string; slot: string }[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.rpc("rider_level_info" as any, { _rider: riderId });
    setInfo(data as unknown as Info);
    const { data: s } = await supabase.from("rider_shifts" as any).select("id,shift_date,slot")
      .eq("rider_id", riderId).gte("shift_date", iso(new Date()));
    setShifts((s as any) ?? []);
  };
  useEffect(() => { load(); }, [riderId]);

  const toggle = async (date: string, slot: string) => {
    setBusy(true);
    const ex = shifts.find((s) => s.shift_date === date && s.slot === slot);
    const { error } = ex
      ? await supabase.from("rider_shifts" as any).delete().eq("id", ex.id)
      : await supabase.from("rider_shifts" as any).insert({ rider_id: riderId, shift_date: date, slot });
    setBusy(false);
    if (error) toast.error(error.message, { id: "shift" });
    else { toast.success(ex ? "شفٹ منسوخ" : "شفٹ بک ہو گئی", { id: "shift" }); load(); }
  };

  if (!info) return null;
  const next = info.bonus_tiers.find((t) => info.week_deliveries < t.target);
  const earned = [...info.bonus_tiers].reverse().find((t) => info.week_deliveries >= t.target);
  const days = Array.from({ length: info.book_days_ahead + 1 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i); return d;
  });

  return (
    <div className="space-y-3" dir="rtl">
      <div className="rounded-xl border bg-card p-3">
        <div className="flex items-center justify-between">
          <span className="font-extrabold">لیول {info.level} / 5</span>
          <span className="text-primary text-lg">{"★".repeat(info.level)}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          اسکور {info.score} — ریٹنگ، آرڈر قبول کرنے کی شرح اور کل ڈلیوریز سے بنتا ہے۔ زیادہ لیول = آرڈرز میں ترجیح اور {info.book_days_ahead} دن آگے تک شفٹ بکنگ۔
        </p>
      </div>

      <div className="rounded-xl border bg-card p-3 space-y-2">
        <div className="font-extrabold">ہفتہ وار بونس</div>
        <p className="text-sm">اس ہفتے: {info.week_deliveries} ڈلیوریز{earned ? ` — Rs ${earned.amount} بونس پکا ✔` : ""}</p>
        {next && (<>
          <Progress value={(info.week_deliveries / next.target) * 100} />
          <p className="text-xs text-muted-foreground">مزید {next.target - info.week_deliveries} ڈلیوریز پر Rs {next.amount}</p>
        </>)}
        <div className="flex gap-2 text-xs">
          {info.bonus_tiers.map((t) => <span key={t.target} className="rounded bg-muted px-2 py-1">{t.target} = Rs {t.amount}</span>)}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-3 space-y-2">
        <div className="font-extrabold">شفٹ بکنگ</div>
        {days.map((d) => {
          const date = iso(d);
          return (
            <div key={date}>
              <div className="text-xs font-bold mb-1">{d.toLocaleDateString("ur-PK", { weekday: "long", day: "numeric", month: "short" })}</div>
              <div className="grid grid-cols-4 gap-1">
                {SLOTS.map((s) => {
                  const on = shifts.some((x) => x.shift_date === date && x.slot === s.id);
                  return (
                    <Button key={s.id} size="sm" disabled={busy} variant={on ? "default" : "outline"}
                      className="text-[10px] h-8 px-1" onClick={() => toggle(date, s.id)}>{s.label}</Button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
