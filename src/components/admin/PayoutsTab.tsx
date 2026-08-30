import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Wallet, RefreshCw } from "lucide-react";
import { loadVendorEarnings, periodStart, type Period, type VendorRow } from "@/components/vendor/vendorEarnings";
import { useAuth } from "@/hooks/useAuth";

const PERIODS: { key: Period; label: string }[] = [
  { key: "week", label: "ہفتہ وار (7 دن)" },
  { key: "fortnight", label: "15 دن" },
  { key: "month", label: "ماہانہ (30 دن)" },
];

const PayoutsTab = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("week");
  const [rows, setRows] = useState<VendorRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<any[]>([]);

  const from = periodStart(period);

  const load = async () => {
    setLoading(true);
    const data = await loadVendorEarnings(from);
    setRows(data);
    const ids = data.map((d) => d.vendorId);
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, phone").in("id", ids);
      const m: Record<string, string> = {};
      (profs || []).forEach((p: any) => { m[p.id] = `${p.full_name || "—"} ${p.phone ? "• " + p.phone : ""}`; });
      setNames(m);
    }
    const { data: hist } = await supabase.from("payouts").select("*").order("created_at", { ascending: false }).limit(25);
    setHistory(hist || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [period]);

  const pay = async (row: VendorRow) => {
    const amount = Number(amounts[row.vendorId] || row.pending);
    if (!amount || amount <= 0) { toast.error("رقم درست نہیں"); return; }
    const { error } = await supabase.from("payouts").insert({
      vendor_id: row.vendorId,
      amount,
      period_start: from.toISOString().slice(0, 10),
      period_end: new Date().toISOString().slice(0, 10),
      payout_method: "jazzcash",
      status: "paid",
      processed_by: user?.id || null,
      processed_at: new Date().toISOString(),
      notes: `${row.shopNames.join(", ")} — کمیشن ${row.commissionRate}%`,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("ادائیگی ریکارڈ ہو گئی ✓");
    load();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base"><Wallet className="h-4 w-4" /> وینڈر پیمنٹس / کمیشن</CardTitle>
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-3.5 w-3.5" /></Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {PERIODS.map((p) => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border ${period === p.key ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>
                {p.label}
              </button>
            ))}
          </div>

          {loading && <p className="text-sm text-muted-foreground">لوڈ ہو رہا ہے…</p>}
          {!loading && rows.length === 0 && <p className="text-sm text-muted-foreground">اس عرصے میں کوئی مکمل آرڈر نہیں</p>}

          {rows.map((r) => (
            <div key={r.vendorId} className="border rounded-xl p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">{r.shopNames.join("، ")}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{names[r.vendorId] || r.vendorId.slice(0, 8)}</p>
                </div>
                <Badge variant="secondary" className="shrink-0">{r.orders} آرڈرز</Badge>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
                <div className="bg-secondary/50 rounded-lg py-1.5"><p className="text-muted-foreground">سیل</p><p className="font-extrabold">Rs {r.gross}</p></div>
                <div className="bg-secondary/50 rounded-lg py-1.5"><p className="text-muted-foreground">کمیشن {r.commissionRate}%</p><p className="font-extrabold text-destructive">− {r.commission}</p></div>
                <div className="bg-secondary/50 rounded-lg py-1.5"><p className="text-muted-foreground">ادا شدہ</p><p className="font-extrabold">Rs {r.paid}</p></div>
                <div className="bg-primary/10 rounded-lg py-1.5"><p className="text-muted-foreground">باقی</p><p className="font-extrabold text-primary">Rs {r.pending}</p></div>
              </div>
              <div className="flex gap-2">
                <Input type="number" placeholder={`Rs ${r.pending}`} value={amounts[r.vendorId] || ""}
                  onChange={(e) => setAmounts({ ...amounts, [r.vendorId]: e.target.value })} className="h-9" />
                <Button size="sm" className="h-9 font-bold" disabled={r.pending <= 0} onClick={() => pay(r)}>ادائیگی ریکارڈ کریں</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">حالیہ ادائیگیاں</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {history.length === 0 && <p className="text-sm text-muted-foreground">ابھی کوئی ادائیگی نہیں</p>}
          {history.map((h) => (
            <div key={h.id} className="flex items-center justify-between text-xs border-b pb-1.5">
              <span className="truncate pr-2">{h.notes || h.vendor_id.slice(0, 8)}</span>
              <span className="font-bold shrink-0">Rs {h.amount} • {h.period_start} → {h.period_end}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default PayoutsTab;
