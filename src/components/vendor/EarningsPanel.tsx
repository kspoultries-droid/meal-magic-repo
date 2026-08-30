import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { loadVendorEarnings, periodStart, type Period, type VendorRow } from "./vendorEarnings";
import { Wallet } from "lucide-react";

const PERIODS: { key: Period; label: string }[] = [
  { key: "week", label: "7 دن" },
  { key: "fortnight", label: "15 دن" },
  { key: "month", label: "30 دن" },
];

const EarningsPanel = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("week");
  const [row, setRow] = useState<VendorRow | null>(null);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const rows = await loadVendorEarnings(periodStart(period), user.id);
      setRow(rows[0] || null);
      const { data } = await supabase.from("payouts").select("*").eq("vendor_id", user.id).order("created_at", { ascending: false }).limit(20);
      setPayouts(data || []);
      setLoading(false);
    })();
  }, [user?.id, period]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Wallet className="h-4 w-4" /> میری کمائی</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            {PERIODS.map((p) => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border ${period === p.key ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>
                {p.label}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">لوڈ ہو رہا ہے…</p>
          ) : !row || row.orders === 0 ? (
            <p className="text-sm text-muted-foreground">اس عرصے میں کوئی مکمل آرڈر نہیں</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="bg-secondary/50 rounded-xl py-3"><p className="text-muted-foreground">مکمل آرڈرز</p><p className="text-lg font-extrabold">{row.orders}</p></div>
              <div className="bg-secondary/50 rounded-xl py-3"><p className="text-muted-foreground">کل سیل</p><p className="text-lg font-extrabold">Rs {row.gross}</p></div>
              <div className="bg-secondary/50 rounded-xl py-3"><p className="text-muted-foreground">پلیٹ فارم کمیشن ({row.commissionRate}%)</p><p className="text-lg font-extrabold text-destructive">− Rs {row.commission}</p></div>
              <div className="bg-primary/10 rounded-xl py-3"><p className="text-muted-foreground">آپ کو ملنا ہے</p><p className="text-lg font-extrabold text-primary">Rs {row.pending}</p></div>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">
            نوٹ: ڈلیوری فیس رائیڈر/پلیٹ فارم کی ہے، اس لیے آپ کی سیل میں شامل نہیں۔ ادائیگی ایڈمن کی طرف سے آپ کے شیڈول (ہفتہ وار / 15 دن / ماہانہ) کے مطابق ہوتی ہے۔
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">وصول شدہ ادائیگیاں</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {payouts.length === 0 && <p className="text-sm text-muted-foreground">ابھی کوئی ادائیگی وصول نہیں ہوئی</p>}
          {payouts.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-xs border-b pb-1.5">
              <span className="text-muted-foreground">{p.period_start} → {p.period_end} • {p.payout_method}</span>
              <span className="font-bold">Rs {p.amount}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default EarningsPanel;
