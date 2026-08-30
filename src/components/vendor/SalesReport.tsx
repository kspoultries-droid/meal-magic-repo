import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, RefreshCw } from "lucide-react";

const DELIVERED = ["delivered", "completed"];

interface OrderRow { total: number; net: number; at: Date }
interface ItemRow { name: string; qty: number; amount: number }

const startOf = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days + 1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const SalesReport = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(30);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const since = startOf(30).toISOString();

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

    const orderRows: OrderRow[] = [
      ...(foodOrders || []),
      ...(gOrders || []),
    ].map((o: any) => ({
      total: Number(o.total_amount || 0),
      net: Math.max(0, Number(o.total_amount || 0) - Number(o.delivery_fee || 0)),
      at: new Date(o.created_at),
    }));

    const bucket = new Map<string, ItemRow>();
    const add = (name: string, qty: number, amount: number) => {
      const cur = bucket.get(name) || { name, qty: 0, amount: 0 };
      cur.qty += qty; cur.amount += amount;
      bucket.set(name, cur);
    };

    const foodIds = (foodOrders || []).map((o: any) => o.id);
    if (foodIds.length) {
      const { data: oi } = await supabase.from("order_items").select("name, quantity, price, unit_price").in("order_id", foodIds);
      (oi || []).forEach((i: any) => add(i.name, Number(i.quantity || 0), Number(i.unit_price ?? i.price ?? 0) * Number(i.quantity || 0)));
    }
    (gOrders || []).forEach((o: any) => {
      const list = Array.isArray(o.items) ? o.items : [];
      list.forEach((i: any) => add(i.name, Number(i.quantity || 1), Number(i.price || 0) * Number(i.quantity || 1)));
    });

    setOrders(orderRows);
    setItems(Array.from(bucket.values()).sort((a, b) => b.amount - a.amount));
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const stats = useMemo(() => {
    const calc = (days: number) => {
      const from = startOf(days);
      const sel = orders.filter((o) => o.at >= from);
      const gross = sel.reduce((s, o) => s + o.net, 0);
      return { orders: sel.length, gross: Math.round(gross), avg: sel.length ? Math.round(gross / sel.length) : 0 };
    };
    return { today: calc(1), week: calc(7), month: calc(30) };
  }, [orders]);

  const filteredItems = useMemo(() => items.slice(0, range === 1 ? 20 : 30), [items, range]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="w-4 h-4" /> سیل رپورٹ</CardTitle>
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">لوڈ ہو رہا ہے…</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 text-center">
              {([
                { label: "آج", s: stats.today },
                { label: "7 دن", s: stats.week },
                { label: "30 دن", s: stats.month },
              ] as const).map((b) => (
                <div key={b.label} className="rounded-xl bg-secondary/50 py-3 px-1">
                  <p className="text-[11px] text-muted-foreground">{b.label}</p>
                  <p className="text-base font-extrabold">Rs {b.s.gross}</p>
                  <p className="text-[10px] text-muted-foreground">{b.s.orders} آرڈرز • اوسط Rs {b.s.avg}</p>
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">نوٹ: ڈلیوری فیس شامل نہیں — یہ صرف آپ کے آئٹمز کی سیل ہے۔</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">آئٹم وائز سیل (30 دن)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">لوڈ ہو رہا ہے…</p>
          ) : filteredItems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">اس عرصے میں کوئی سیل نہیں</p>
          ) : (
            <div className="space-y-1.5">
              {filteredItems.map((i) => (
                <div key={i.name} className="flex items-center justify-between gap-2 border-b pb-1.5 text-sm">
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
