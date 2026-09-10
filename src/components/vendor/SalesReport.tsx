import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Download, RefreshCw, ShoppingBag } from "lucide-react";
import DayNavigator, { dayKey, startOfDay } from "@/components/common/DayNavigator";
import TrendChart from "@/components/common/TrendChart";
import { downloadCsv } from "@/lib/csv";

const DELIVERED = ["delivered", "completed"];
const WINDOW_DAYS = 60;

interface ItemRow { name: string; qty: number; amount: number }
interface OrderRow { total: number; net: number; at: Date; items: ItemRow[] }

const startOf = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days + 1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const SalesReport = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState<Date>(startOfDay(new Date()));

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const since = startOf(WINDOW_DAYS).toISOString();

    const [{ data: rests }, { data: stores }] = await Promise.all([
      supabase.from("restaurants").select("id").eq("owner_id", user.id),
      supabase.from("grocery_stores").select("id").eq("owner_id", user.id),
    ]);
    const restIds = (rests || []).map((r: any) => r.id);
    const storeIds = (stores || []).map((s: any) => s.id);

    const [{ data: foodOrders }, { data: gOrders }] = await Promise.all([
      restIds.length
        ? supabase.from("orders").select("id, total_amount, delivery_fee, created_at")
            .in("restaurant_id", restIds).in("status", DELIVERED).gte("created_at", since)
        : Promise.resolve({ data: [] as any[] }),
      storeIds.length
        ? supabase.from("grocery_cart_orders").select("id, total_amount, delivery_fee, created_at, items")
            .in("store_id", storeIds).in("status", DELIVERED).gte("created_at", since)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const itemsByOrder = new Map<string, ItemRow[]>();
    const foodIds = (foodOrders || []).map((o: any) => o.id);
    if (foodIds.length) {
      const { data: oi } = await supabase
        .from("order_items")
        .select("order_id, name, quantity, price, unit_price, variant_label")
        .in("order_id", foodIds);
      (oi || []).forEach((i: any) => {
        const list = itemsByOrder.get(i.order_id) || [];
        const qty = Number(i.quantity || 0);
        list.push({
          name: `${i.name}${i.variant_label ? ` — ${i.variant_label}` : ""}`,
          qty,
          amount: Number(i.unit_price ?? i.price ?? 0) * qty,
        });
        itemsByOrder.set(i.order_id, list);
      });
    }

    const rows: OrderRow[] = [
      ...(foodOrders || []).map((o: any) => ({
        total: Number(o.total_amount || 0),
        net: Math.max(0, Number(o.total_amount || 0) - Number(o.delivery_fee || 0)),
        at: new Date(o.created_at),
        items: itemsByOrder.get(o.id) || [],
      })),
      ...(gOrders || []).map((o: any) => ({
        total: Number(o.total_amount || 0),
        net: Math.max(0, Number(o.total_amount || 0) - Number(o.delivery_fee || 0)),
        at: new Date(o.created_at),
        items: (Array.isArray(o.items) ? o.items : []).map((i: any) => ({
          name: i.name,
          qty: Number(i.quantity || 1),
          amount: Number(i.price || 0) * Number(i.quantity || 1),
        })),
      })),
    ];

    setOrders(rows);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const stats = useMemo(() => {
    const calc = (days: number) => {
      const from = startOf(days);
      const sel = orders.filter((o) => o.at >= from);
      const gross = sel.reduce((s, o) => s + o.net, 0);
      return { orders: sel.length, gross: Math.round(gross), avg: sel.length ? Math.round(gross / sel.length) : 0 };
    };
    return { today: calc(1), week: calc(7), month: calc(30) };
  }, [orders]);

  const dayOrders = useMemo(
    () => orders.filter((o) => dayKey(o.at) === dayKey(day)),
    [orders, day]
  );

  const dayStats = useMemo(() => {
    const gross = dayOrders.reduce((s, o) => s + o.net, 0);
    const qty = dayOrders.reduce((s, o) => s + o.items.reduce((q, i) => q + i.qty, 0), 0);
    return {
      orders: dayOrders.length,
      qty,
      gross: Math.round(gross),
      avg: dayOrders.length ? Math.round(gross / dayOrders.length) : 0,
    };
  }, [dayOrders]);

  const dayItems = useMemo(() => {
    const m = new Map<string, ItemRow>();
    dayOrders.forEach((o) =>
      o.items.forEach((i) => {
        const cur = m.get(i.name) || { name: i.name, qty: 0, amount: 0 };
        cur.qty += i.qty;
        cur.amount += i.amount;
        m.set(i.name, cur);
      })
    );
    return Array.from(m.values()).sort((a, b) => b.qty - a.qty);
  }, [dayOrders]);

  const monthItems = useMemo(() => {
    const from = startOf(30);
    const m = new Map<string, ItemRow>();
    orders.filter((o) => o.at >= from).forEach((o) =>
      o.items.forEach((i) => {
        const cur = m.get(i.name) || { name: i.name, qty: 0, amount: 0 };
        cur.qty += i.qty;
        cur.amount += i.amount;
        m.set(i.name, cur);
      })
    );
    return Array.from(m.values()).sort((a, b) => b.amount - a.amount).slice(0, 30);
  }, [orders]);

  const last7 = useMemo(() => {
    const out: { key: string; label: string; orders: number; qty: number; gross: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(day);
      d.setDate(d.getDate() - i);
      const sel = orders.filter((o) => dayKey(o.at) === dayKey(d));
      out.push({
        key: dayKey(d),
        label: d.toLocaleDateString("ur-PK", { day: "numeric", month: "short" }),
        orders: sel.length,
        qty: sel.reduce((s, o) => s + o.items.reduce((q, i) => q + i.qty, 0), 0),
        gross: Math.round(sel.reduce((s, o) => s + o.net, 0)),
      });
    }
    return out;
  }, [orders, day]);

  const trend30 = useMemo(() => {
    const out: { label: string; value: number; secondary: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const sel = orders.filter((o) => dayKey(o.at) === dayKey(d));
      out.push({
        label: d.toLocaleDateString("ur-PK", { day: "numeric", month: "short" }),
        value: Math.round(sel.reduce((s, o) => s + o.net, 0)),
        secondary: sel.length,
      });
    }
    return out;
  }, [orders]);

  const exportCsv = () => {
    const byDay = new Map<string, { orders: number; qty: number; gross: number }>();
    orders.forEach((o) => {
      const k = dayKey(o.at);
      const cur = byDay.get(k) || { orders: 0, qty: 0, gross: 0 };
      cur.orders += 1;
      cur.qty += o.items.reduce((q, i) => q + i.qty, 0);
      cur.gross += o.net;
      byDay.set(k, cur);
    });
    downloadCsv(
      `sales-report-${new Date().toISOString().slice(0, 10)}`,
      ["تاریخ", "آرڈرز", "آئٹمز", "سیل"],
      Array.from(byDay.entries())
        .sort((a, b) => (a[0] < b[0] ? 1 : -1))
        .map(([k, v]) => [k, v.orders, v.qty, Math.round(v.gross)])
    );
  };

  return (
    <div className="space-y-1.5">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between px-3 py-2">
          <CardTitle className="flex items-center gap-2 text-sm"><BarChart3 className="w-4 h-4" /> سیل رپورٹ</CardTitle>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={exportCsv} disabled={!orders.length}><Download className="w-4 h-4" /></Button>
            <Button size="sm" variant="outline" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-1.5 px-3 pb-2">
          {loading ? (
            <p className="text-xs text-muted-foreground">لوڈ ہو رہا ہے…</p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5 text-center">
              {([
                { label: "آج", s: stats.today },
                { label: "7 دن", s: stats.week },
                { label: "30 دن", s: stats.month },
              ] as const).map((b) => (
                <div key={b.label} className="rounded-lg bg-secondary/50 px-1 py-1.5">
                  <p className="text-[11px] text-muted-foreground">{b.label}</p>
                  <p className="text-sm font-extrabold">Rs {b.s.gross}</p>
                  <p className="text-[10px] text-muted-foreground">{b.s.orders} آرڈرز • اوسط Rs {b.s.avg}</p>
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">نوٹ: ڈلیوری فیس شامل نہیں — یہ صرف آپ کے آئٹمز کی سیل ہے۔</p>
        </CardContent>
      </Card>

      {/* دن کے حساب سے */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-col gap-1.5 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-sm">📅 دن کے حساب سے</CardTitle>
          <DayNavigator date={day} onChange={setDay} />
        </CardHeader>
        <CardContent className="space-y-1.5 px-3 pb-2">
          <div className="grid grid-cols-2 gap-1.5 text-center text-[11px] sm:grid-cols-4">
            <div className="rounded-lg bg-secondary/50 py-1.5"><p className="text-muted-foreground">کل آرڈرز</p><p className="text-xs font-extrabold">{dayStats.orders}</p></div>
            <div className="rounded-lg bg-secondary/50 py-1.5"><p className="text-muted-foreground">کل آئٹمز</p><p className="text-xs font-extrabold">{dayStats.qty}</p></div>
            <div className="rounded-lg bg-primary/10 py-1.5"><p className="text-muted-foreground">سیل</p><p className="text-xs font-extrabold text-primary">Rs {dayStats.gross}</p></div>
            <div className="rounded-lg bg-secondary/50 py-1.5"><p className="text-muted-foreground">اوسط</p><p className="text-xs font-extrabold">Rs {dayStats.avg}</p></div>
          </div>

          <div className="rounded-lg border p-1.5">
            <p className="mb-1.5 text-[11px] font-bold text-muted-foreground">پچھلے 7 دن</p>
            <div className="space-y-1">
              {last7.map((d) => (
                <button
                  key={d.key}
                  onClick={() => setDay(new Date(d.key))}
                   className={`flex w-full items-center justify-between rounded-lg px-2 py-1 text-[11px] transition-colors ${
                    d.key === dayKey(day) ? "bg-primary/10 font-bold" : "hover:bg-secondary/50"
                  }`}
                >
                  <span>{d.label}</span>
                  <span className="text-muted-foreground">{d.orders} آرڈرز • {d.qty} آئٹمز</span>
                  <span className="font-extrabold">Rs {d.gross}</span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="px-3 py-2"><CardTitle className="text-sm">30 دن کا سیل رجحان</CardTitle></CardHeader>
        <CardContent className="px-1 pb-2"><TrendChart data={trend30} valueLabel="سیل" height={170} /></CardContent>
      </Card>

      {/* اس دن کی ڈش وائز رپورٹ */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="px-3 py-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShoppingBag className="h-4 w-4" /> ڈش وائز (منتخب دن)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-2">
          {dayItems.length === 0 ? (
            <p className="py-3 text-center text-xs text-muted-foreground">اس دن کوئی سیل نہیں</p>
          ) : (
            <div className="space-y-1">
              {dayItems.map((i) => (
                <div key={i.name} className="flex items-center justify-between gap-2 border-b pb-1 text-xs">
                  <span className="truncate">{i.name}</span>
                  <span className="shrink-0 rounded-full bg-secondary px-2 text-xs font-bold">×{i.qty}</span>
                  <span className="shrink-0 font-extrabold">Rs {Math.round(i.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="px-3 py-2">
          <CardTitle className="text-sm">آئٹم وائز سیل (30 دن)</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-2">
          {loading ? (
            <p className="text-xs text-muted-foreground">لوڈ ہو رہا ہے…</p>
          ) : monthItems.length === 0 ? (
            <p className="py-3 text-center text-xs text-muted-foreground">اس عرصے میں کوئی سیل نہیں</p>
          ) : (
            <div className="space-y-1">
              {monthItems.map((i) => (
                <div key={i.name} className="flex items-center justify-between gap-2 border-b pb-1 text-xs">
                  <span className="truncate">{i.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">×{i.qty}</span>
                  <span className="shrink-0 font-extrabold">Rs {Math.round(i.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesReport;
