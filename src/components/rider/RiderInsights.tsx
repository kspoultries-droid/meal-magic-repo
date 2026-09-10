import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, Target } from "lucide-react";
import TrendChart from "@/components/common/TrendChart";
import { downloadCsv } from "@/lib/csv";

interface Row { created_at: string; amount: number; distance_km: number | null; order_kind: string; order_id: string }

const DAYS = 14;
const DAILY_GOAL = 1500;

const RiderInsights = ({ riderId }: { riderId: string }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (DAYS - 1));
    const { data } = await supabase
      .from("rider_earnings")
      .select("created_at, amount, distance_km, order_kind, order_id")
      .eq("rider_id", riderId)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false });
    setRows((data || []) as unknown as Row[]);
    setLoading(false);
  }, [riderId]);

  useEffect(() => { load(); }, [load]);

  const daily = useMemo(() => {
    const out: { key: string; label: string; value: number; secondary: number }[] = [];
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const sel = rows.filter((r) => r.created_at.slice(0, 10) === key);
      out.push({
        key,
        label: d.toLocaleDateString("ur-PK", { day: "numeric", month: "short" }),
        value: Math.round(sel.reduce((s, r) => s + Number(r.amount || 0), 0)),
        secondary: sel.length,
      });
    }
    return out;
  }, [rows]);

  const today = daily[daily.length - 1];
  const totalKm = rows.reduce((s, r) => s + Number(r.distance_km || 0), 0);
  const totalAmount = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const perOrder = rows.length ? Math.round(totalAmount / rows.length) : 0;
  const perKm = totalKm > 0 ? Math.round(totalAmount / totalKm) : 0;
  const progress = Math.min(100, Math.round(((today?.value || 0) / DAILY_GOAL) * 100));

  const exportCsv = () =>
    downloadCsv(
      `rider-earnings-${new Date().toISOString().slice(0, 10)}`,
      ["تاریخ", "قسم", "آرڈر", "فاصلہ (کلومیٹر)", "کمائی"],
      rows.map((r) => [r.created_at.slice(0, 10), r.order_kind, r.order_id.slice(0, 8), Number(r.distance_km || 0), Math.round(Number(r.amount || 0))])
    );

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between gap-2 px-3 py-2">
        <CardTitle className="flex items-center gap-1.5 text-sm"><Target className="h-4 w-4" /> کارکردگی</CardTitle>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" className="h-7 px-2" onClick={exportCsv} disabled={!rows.length}><Download className="h-3.5 w-3.5" /></Button>
          <Button size="sm" variant="outline" className="h-7 px-2" onClick={load}><RefreshCw className="h-3.5 w-3.5" /></Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 px-3 pb-3">
        <div className="rounded-xl bg-secondary/50 px-3 py-2">
          <div className="mb-1 flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">آج کا ہدف Rs {DAILY_GOAL}</span>
            <span className="font-extrabold">Rs {today?.value || 0} ({progress}%)</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-background">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 text-center text-[11px]">
          <div className="rounded-lg bg-secondary/50 py-1.5"><p className="text-muted-foreground">فی آرڈر</p><p className="text-xs font-extrabold">Rs {perOrder}</p></div>
          <div className="rounded-lg bg-secondary/50 py-1.5"><p className="text-muted-foreground">فی کلومیٹر</p><p className="text-xs font-extrabold">Rs {perKm}</p></div>
          <div className="rounded-lg bg-secondary/50 py-1.5"><p className="text-muted-foreground">14 دن ڈلیوری</p><p className="text-xs font-extrabold">{rows.length}</p></div>
        </div>

        {loading ? (
          <p className="text-xs text-muted-foreground">لوڈ ہو رہا ہے…</p>
        ) : (
          <TrendChart data={daily} valueLabel="کمائی" height={150} />
        )}
      </CardContent>
    </Card>
  );
};

export default RiderInsights;
