import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Download, RefreshCw, Search, AlertTriangle, Bike, Store, ShoppingBag, Wallet } from "lucide-react";
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
  riders_total: number;
  shops_closed: number;
  shops_total: number;
  pending_applications: number;
  pending_remittances: number;
  pending_payouts: number;
  cancelled_today: number;
}

interface TrendRow { day: string; orders_count: number; gross: number; commission: number }

interface SearchHit { kind: string; label: string; sub: string; section: string; subTab?: string }

type NavFn = (section: string, sub?: string) => void;

const OverviewTab = ({ onNavigate }: { onNavigate?: NavFn }) => {
  const [data, setData] = useState<Overview | null>(null);
  const [trend, setTrend] = useState<TrendRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: ov }, { data: tr }] = await Promise.all([
      supabase.rpc("admin_overview" as any),
      supabase.rpc("admin_daily_trend" as any, { _days: 30 }),
    ]);
    setData((ov as unknown as Overview) || null);
    setTrend(((tr as unknown as TrendRow[]) || []));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-overview-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "grocery_cart_orders" }, () => load())
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

  const runSearch = async () => {
    const q = query.trim();
    if (q.length < 2) { setHits([]); return; }
    setSearching(true);
    const like = `%${q}%`;
    const [rests, stores, people, order] = await Promise.all([
      supabase.from("restaurants").select("id, name, is_active").ilike("name", like).limit(6),
      supabase.from("grocery_stores").select("id, name, is_active").ilike("name", like).limit(6),
      supabase.from("profiles").select("id, full_name, phone").or(`full_name.ilike.${like},phone.ilike.${like}`).limit(6),
      /^[0-9a-f-]{6,}$/i.test(q)
        ? supabase.from("orders").select("id, status, total_amount").ilike("id", `${q}%`).limit(5)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const out: SearchHit[] = [
      ...((rests.data || []) as any[]).map((r) => ({ kind: "ریسٹورنٹ", label: r.name, sub: r.is_active ? "کھلا" : "بند" })),
      ...((stores.data || []) as any[]).map((s) => ({ kind: "گروسری", label: s.name, sub: s.is_active ? "کھلا" : "بند" })),
      ...((people.data || []) as any[]).map((p) => ({ kind: "صارف", label: p.full_name || p.id.slice(0, 8), sub: p.phone || "—" })),
      ...((order.data || []) as any[]).map((o) => ({ kind: "آرڈر", label: o.id.slice(0, 8), sub: `${o.status} • Rs ${Math.round(Number(o.total_amount || 0))}` })),
    ];
    setHits(out);
    setSearching(false);
  };

  const exportTrend = () => {
    downloadCsv(
      `easylife-daily-trend-${new Date().toISOString().slice(0, 10)}`,
      ["تاریخ", "آرڈرز", "کل سیل", "کمیشن"],
      trend.map((t) => [t.day, t.orders_count, Math.round(Number(t.gross || 0)), Math.round(Number(t.commission || 0))])
    );
  };

  const cards = data
    ? [
        { label: "آج کے آرڈرز", value: `${Number(data.food_today) + Number(data.grocery_today)}`, sub: `فوڈ ${data.food_today} • گروسری ${data.grocery_today}`, icon: ShoppingBag, tone: "text-foreground" },
        { label: "آج کی سیل", value: `Rs ${Math.round(Number(data.gross_today))}`, sub: `کمیشن Rs ${Math.round(Number(data.commission_today))}`, icon: Wallet, tone: "text-primary" },
        { label: "زیرِ عمل آرڈرز", value: `${data.pending_orders}`, sub: `بغیر رائیڈر ${data.unassigned_orders}`, icon: RefreshCw, tone: "text-foreground" },
        { label: "رُکے ہوئے آرڈرز", value: `${data.stuck_orders}`, sub: "45 منٹ سے زیادہ", icon: AlertTriangle, tone: data.stuck_orders ? "text-destructive" : "text-muted-foreground" },
        { label: "آن لائن رائیڈرز", value: `${data.riders_online}/${data.riders_total}`, sub: "ابھی دستیاب", icon: Bike, tone: "text-success" },
        { label: "بند دکانیں", value: `${data.shops_closed}/${data.shops_total}`, sub: "ریسٹورنٹس", icon: Store, tone: "text-foreground" },
        { label: "نئی درخواستیں", value: `${data.pending_applications}`, sub: "منظوری کی منتظر", icon: Store, tone: data.pending_applications ? "text-warning" : "text-muted-foreground" },
        { label: "زیرِ التوا ادائیگیاں", value: `${Number(data.pending_payouts) + Number(data.pending_remittances)}`, sub: `سلپس ${data.pending_remittances}`, icon: Wallet, tone: "text-foreground" },
      ]
    : [];

  return (
    <div className="space-y-3">
      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between gap-2 px-4 py-3">
          <CardTitle className="text-base">کمانڈ سینٹر</CardTitle>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={exportTrend} disabled={!trend.length}><Download className="h-3.5 w-3.5" /></Button>
            <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-3.5 w-3.5" /></Button>
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
                <div key={c.label} className="rounded-xl border bg-card px-3 py-2.5">
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <c.icon className="h-3.5 w-3.5" /> {c.label}
                  </div>
                  <p className={`text-lg font-extrabold leading-none ${c.tone}`}>{c.value}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{c.sub}</p>
                </div>
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

      <Card className="border-border/60">
        <CardHeader className="px-4 py-3"><CardTitle className="text-sm">گلوبل سرچ</CardTitle></CardHeader>
        <CardContent className="space-y-2 px-4 pb-4">
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") runSearch(); }}
              placeholder="دکان، صارف، فون یا آرڈر آئی ڈی تلاش کریں"
              className="h-9 text-sm"
            />
            <Button size="sm" className="h-9" onClick={runSearch} disabled={searching}><Search className="h-4 w-4" /></Button>
          </div>
          {hits.length > 0 && (
            <div className="space-y-1">
              {hits.map((h, i) => (
                <div key={`${h.kind}-${h.label}-${i}`} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-xs">
                  <Badge variant="secondary" className="shrink-0 text-[10px]">{h.kind}</Badge>
                  <span className="flex-1 truncate font-bold">{h.label}</span>
                  <span className="shrink-0 text-muted-foreground">{h.sub}</span>
                </div>
              ))}
            </div>
          )}
          {!searching && query.trim().length >= 2 && hits.length === 0 && (
            <p className="text-xs text-muted-foreground">کوئی نتیجہ نہیں ملا</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OverviewTab;
