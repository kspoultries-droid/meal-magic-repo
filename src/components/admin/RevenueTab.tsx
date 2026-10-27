import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, RefreshCw, Download } from "lucide-react";

type Range = "today" | "week" | "month";

const RANGES: { key: Range; label: string; days: number }[] = [
  { key: "today", label: "آج", days: 0 },
  { key: "week", label: "اس ہفتے", days: 7 },
  { key: "month", label: "اس ماہ", days: 30 },
];

const SECTOR_LABEL: Record<string, string> = {
  food: "فوڈ",
  grocery: "گروسری",
  wholesale: "بازار / ہول سیل",
  service: "ہوم سروسز",
  partner: "پارٹنر API",
};

interface Row {
  id: string;
  sector: string;
  order_kind: string;
  vendor_id: string | null;
  city_id: string | null;
  gross: number;
  rate: number;
  commission: number;
  delivery_fee: number;
  net_payable: number;
  partner_channel: string;
  created_at: string;
}

const rangeStart = (r: Range) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const days = RANGES.find((x) => x.key === r)!.days;
  if (days) d.setDate(d.getDate() - days);
  return d;
};

const RevenueTab = () => {
  const [range, setRange] = useState<Range>("week");
  const [rows, setRows] = useState<Row[]>([]);
  const [cities, setCities] = useState<Record<string, string>>({});
  const [vendors, setVendors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("platform_commissions")
      .select("*")
      .gte("created_at", rangeStart(range).toISOString())
      .order("created_at", { ascending: false });
    const list = (data || []) as unknown as Row[];
    setRows(list);

    const cityIds = Array.from(new Set(list.map((r) => r.city_id).filter(Boolean))) as string[];
    if (cityIds.length) {
      const { data: cs } = await supabase.from("cities").select("id, name").in("id", cityIds);
      const m: Record<string, string> = {};
      (cs || []).forEach((c: any) => { m[c.id] = c.name; });
      setCities(m);
    }
    const vIds = Array.from(new Set(list.map((r) => r.vendor_id).filter(Boolean))) as string[];
    if (vIds.length) {
      const { data: ps } = await supabase.from("profiles").select("id, full_name").in("id", vIds);
      const m: Record<string, string> = {};
      (ps || []).forEach((p: any) => { m[p.id] = p.full_name || p.id.slice(0, 8); });
      setVendors(m);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [range]);

  const totals = useMemo(() => {
    const sum = (f: (r: Row) => number) => rows.reduce((s, r) => s + Number(f(r) || 0), 0);
    return {
      orders: rows.length,
      gross: Math.round(sum((r) => r.gross)),
      commission: Math.round(sum((r) => r.commission)),
      delivery: Math.round(sum((r) => r.delivery_fee)),
      payable: Math.round(sum((r) => r.net_payable)),
    };
  }, [rows]);

  const bySector = useMemo(() => {
    const m = new Map<string, { orders: number; gross: number; commission: number }>();
    rows.forEach((r) => {
      const cur = m.get(r.sector) || { orders: 0, gross: 0, commission: 0 };
      cur.orders += 1;
      cur.gross += Number(r.gross || 0);
      cur.commission += Number(r.commission || 0);
      m.set(r.sector, cur);
    });
    return Array.from(m.entries()).sort((a, b) => b[1].commission - a[1].commission);
  }, [rows]);

  const byCity = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => {
      const k = r.city_id ? cities[r.city_id] || "—" : "—";
      m.set(k, (m.get(k) || 0) + Number(r.commission || 0));
    });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [rows, cities]);

  const topVendors = useMemo(() => {
    const m = new Map<string, { commission: number; gross: number; orders: number }>();
    rows.forEach((r) => {
      if (!r.vendor_id) return;
      const cur = m.get(r.vendor_id) || { commission: 0, gross: 0, orders: 0 };
      cur.commission += Number(r.commission || 0);
      cur.gross += Number(r.gross || 0);
      cur.orders += 1;
      m.set(r.vendor_id, cur);
    });
    return Array.from(m.entries()).sort((a, b) => b[1].commission - a[1].commission).slice(0, 10);
  }, [rows]);

  const cell = (v: unknown) => {
    let t = v == null ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;
    return `"${t.replace(/"/g, '""')}"`;
  };
  const exportCsv = () => {
    const header = ["date", "sector", "order_id", "vendor", "city", "gross", "rate", "commission", "delivery_fee", "net_payable", "channel"];
    const lines = rows.map((r) => [
      new Date(r.created_at).toISOString().slice(0, 10),
      r.sector,
      r.id,
      r.vendor_id ? vendors[r.vendor_id] || r.vendor_id : "",
      r.city_id ? cities[r.city_id] || "" : "",
      r.gross, r.rate, r.commission, r.delivery_fee, r.net_payable, r.partner_channel,
    ].map(cell).join(","));
    const blob = new Blob(["\uFEFF" + [header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `easylife-revenue-${range}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4" /> پلیٹ فارم آمدنی</CardTitle>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={exportCsv} disabled={!rows.length}><Download className="h-3.5 w-3.5" /></Button>
            <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-3.5 w-3.5" /></Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {RANGES.map((r) => (
              <button key={r.key} onClick={() => setRange(r.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border ${range === r.key ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>
                {r.label}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">لوڈ ہو رہا ہے…</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="rounded-xl bg-secondary/50 py-3"><p className="text-muted-foreground">مکمل آرڈرز</p><p className="text-lg font-extrabold">{totals.orders}</p></div>
                <div className="rounded-xl bg-secondary/50 py-3"><p className="text-muted-foreground">کل سیل</p><p className="text-lg font-extrabold">Rs {totals.gross}</p></div>
                <div className="rounded-xl bg-primary/10 py-3"><p className="text-muted-foreground">کمیشن آمدنی</p><p className="text-lg font-extrabold text-primary">Rs {totals.commission}</p></div>
                <div className="rounded-xl bg-secondary/50 py-3"><p className="text-muted-foreground">ڈلیوری فیس</p><p className="text-lg font-extrabold">Rs {totals.delivery}</p></div>
              </div>
              <div className="rounded-xl border p-3 text-center">
                <p className="text-xs text-muted-foreground">کل پلیٹ فارم آمدنی (کمیشن + ڈلیوری فیس)</p>
                <p className="text-2xl font-extrabold text-primary">Rs {totals.commission + totals.delivery}</p>
                <p className="text-[11px] text-muted-foreground">وینڈرز کو قابلِ ادائیگی: Rs {totals.payable}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">شعبہ وار</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {bySector.length === 0 && <p className="text-sm text-muted-foreground">اس عرصے میں کوئی ریکارڈ نہیں</p>}
          {bySector.map(([sector, v]) => (
            <div key={sector} className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold">{SECTOR_LABEL[sector] || sector}</span>
                <Badge variant="secondary">{v.orders}</Badge>
              </div>
              <span>سیل Rs {Math.round(v.gross)} • کمیشن <b className="text-primary">Rs {Math.round(v.commission)}</b></span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">شہر وار کمیشن</CardTitle></CardHeader>
        <CardContent className="space-y-1.5">
          {byCity.length === 0 && <p className="text-sm text-muted-foreground">کوئی ریکارڈ نہیں</p>}
          {byCity.map(([city, amt]) => (
            <div key={city} className="flex items-center justify-between border-b pb-1 text-xs">
              <span>{city}</span><span className="font-bold">Rs {Math.round(amt)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">ٹاپ 10 وینڈرز</CardTitle></CardHeader>
        <CardContent className="space-y-1.5">
          {topVendors.length === 0 && <p className="text-sm text-muted-foreground">کوئی ریکارڈ نہیں</p>}
          {topVendors.map(([vid, v]) => (
            <div key={vid} className="flex items-center justify-between border-b pb-1 text-xs">
              <span className="truncate pr-2">{vendors[vid] || vid.slice(0, 8)} • {v.orders} آرڈرز</span>
              <span className="shrink-0 font-bold">کمیشن Rs {Math.round(v.commission)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default RevenueTab;
