import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, AlertTriangle, Bike, Store, ShoppingBag, Wallet } from "lucide-react";
import TrendChart from "@/components/common/TrendChart";
import { downloadCsv } from "@/lib/csv";

interface Overview {
  food_today: number;
  grocery_today: number;
  gross_today: number;
  commission_today: number;
  pending_orders: number;
  stuck_orders: number;
  unassigned_orders: number;
  riders_online: number;
  riders_present: number;
  riders_total: number;
  shops_closed: number;
  shops_total: number;
  pending_applications: number;
  pending_remittances: number;
  pending_payouts: number;
  cancelled_today: number;
}

interface TrendRow { day: string; orders_count: number; gross: number; commission: number }

type NavFn = (section: string, sub?: string) => void;

const OverviewTab = ({ onNavigate }: { onNavigate?: NavFn }) => {
  const [data, setData] = useState<Overview | null>(null);
  const [trend, setTrend] = useState<TrendRow[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    const [{ data: ov, error: overviewError }, { data: tr, error: trendError }] = await Promise.all([
      supabase.rpc("admin_overview" as any),
      supabase.rpc("admin_daily_trend" as any, { _days: 30 }),
    ]);
    if (!overviewError) setData((ov as unknown as Overview) || null);
    if (!trendError) setTrend(((tr as unknown as TrendRow[]) || []));
    setLoading(false);
  }, []);

  useEffect(() => { load(true); }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-overview-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load(false))
      .on("postgres_changes", { event: "*", schema: "public", table: "grocery_cart_orders" }, () => load(false))
      .on("postgres_changes", { event: "*", schema: "public", table: "riders" }, () => load(false))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const chart = useMemo(
    () => trend.map((t) => ({
      label: new Date(t.day).toLocaleDateString("ur-PK", { day: "numeric", month: "short" }),
      value: Math.round(Number(t.gross || 0)),
      secondary: Math.round(Number(t.commission || 0)),
    })),
    [trend]
  );

  const exportTrend = () => {
    downloadCsv(
      `easylife-daily-trend-${new Date().toISOString().slice(0, 10)}`,
      ["تاریخ", "آرڈرز", "کل سیل", "کمیشن"],
      trend.map((t) => [t.day, t.orders_count, Math.round(Number(t.gross || 0)), Math.round(Number(t.commission || 0))])
    );
  };

  const cards = data
    ? [
        { label: "آج کے آرڈرز", value: `${Number(data.food_today) + Number(data.grocery_today)}`, sub: `فوڈ ${data.food_today} • گروسری ${data.grocery_today}`, icon: ShoppingBag, tone: "text-foreground", section: "operations", subTab: "orders" },
        { label: "آج کی سیل", value: `Rs ${Math.round(Number(data.gross_today))}`, sub: `کمیشن Rs ${Math.round(Number(data.commission_today))}`, icon: Wallet, tone: "text-primary", section: "finance", subTab: "revenue" },
        { label: "زیرِ عمل آرڈرز", value: `${data.pending_orders}`, sub: `بغیر رائیڈر ${data.unassigned_orders}`, icon: RefreshCw, tone: "text-foreground", section: "operations", subTab: "orders" },
        { label: "رُکے ہوئے آرڈرز", value: `${data.stuck_orders}`, sub: "45 منٹ سے زیادہ", icon: AlertTriangle, tone: data.stuck_orders ? "text-destructive" : "text-muted-foreground", section: "operations", subTab: "grocery-dispatch" },
        { label: "آن لائن رائیڈرز", value: `${data.riders_online}`, sub: `ایپ میں فعال ${data.riders_present ?? 0} • کل رائیڈر ${data.riders_total}`, icon: Bike, tone: data.riders_online ? "text-success" : "text-muted-foreground", section: "partners", subTab: "riders" },
        { label: "بند دکانیں", value: `${data.shops_closed}/${data.shops_total}`, sub: "ریسٹورنٹس", icon: Store, tone: "text-foreground", section: "partners", subTab: "restaurants" },
        { label: "نئی درخواستیں", value: `${data.pending_applications}`, sub: "منظوری کی منتظر", icon: Store, tone: data.pending_applications ? "text-warning" : "text-muted-foreground", section: "partners", subTab: "applications" },
        { label: "زیرِ التوا ادائیگیاں", value: `${Number(data.pending_payouts) + Number(data.pending_remittances)}`, sub: `سلپس ${data.pending_remittances}`, icon: Wallet, tone: "text-foreground", section: "finance", subTab: "payouts" },
      ]
    : [];

  return (
    <div className="space-y-3">
      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between gap-2 px-4 py-3">
          <CardTitle className="text-base">کمانڈ سینٹر</CardTitle>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={exportTrend} disabled={!trend.length}><Download className="h-3.5 w-3.5" /></Button>
            <Button size="sm" variant="outline" onClick={() => load(true)}><RefreshCw className="h-3.5 w-3.5" /></Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {loading ? (
            <p className="text-xs text-muted-foreground">لوڈ ہو رہا ہے…</p>
          ) : !data ? (
            <p className="text-xs text-muted-foreground">ڈیٹا دستیاب نہیں</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {cards.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => onNavigate?.(c.section, c.subTab)}
                  className="rounded-xl border bg-card px-3 py-2.5 text-start transition hover:border-primary hover:bg-primary/5 active:scale-[0.98]"
                >
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <c.icon className="h-3.5 w-3.5" /> {c.label}
                  </div>
                  <p className={`text-lg font-extrabold leading-none ${c.tone}`}>{c.value}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{c.sub}</p>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="px-4 py-3"><CardTitle className="text-sm">30 دن کا رجحان (سیل اور کمیشن)</CardTitle></CardHeader>
        <CardContent className="px-2 pb-3">
          <TrendChart data={chart} valueLabel="سیل" secondaryLabel="کمیشن" height={200} />
        </CardContent>
      </Card>

    </div>
  );
};

export default OverviewTab;
