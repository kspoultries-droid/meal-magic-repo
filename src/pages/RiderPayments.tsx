import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Wallet, Banknote, Receipt } from "lucide-react";
import RiderRemittance from "@/components/rider/RiderRemittance";

const RiderPayments = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<any>(null);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [salaries, setSalaries] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  const [me, setMe] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    const [{ data: sum }, { data: earn }, { data: sal }, { data: rider }, { data: revs }] = await Promise.all([
      supabase.rpc("get_rider_summary"),
      supabase.from("rider_earnings").select("*").eq("rider_id", user.id).order("created_at", { ascending: false }).limit(30),
      supabase.from("rider_salary_payouts").select("*").eq("rider_id", user.id).order("created_at", { ascending: false }).limit(12),
      supabase.from("riders").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("rider_reviews" as any).select("*").eq("rider_id", user.id).order("created_at", { ascending: false }).limit(10),
    ]);
    setSummary(Array.isArray(sum) ? sum[0] : sum);
    setEarnings(earn || []);
    setSalaries(sal || []);
    setMe(rider || null);
    setReviews((revs as any[]) || []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const cashDue = Number(summary?.cash_due ?? 0);

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur px-3 py-2.5 flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/rider-dashboard")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-sm font-extrabold text-primary leading-tight">پیمنٹ اور کمائی</h1>
          <p className="text-[10px] text-muted-foreground">جمع کرائی گئی رقم، کمائی اور تنخواہ</p>
        </div>
      </header>

      <div className="p-3 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "کل کمائی", value: `Rs ${Math.round(Number(summary?.total_earnings ?? 0))}`, cls: "text-success" },
            { label: "جمع کرا دی", value: `Rs ${Math.round(Number(summary?.remitted ?? 0))}`, cls: "text-primary" },
            { label: "واجب الادا", value: `Rs ${Math.round(cashDue)}`, cls: "text-destructive" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border bg-card px-1.5 py-2.5 text-center">
              <p className="text-[9px] text-muted-foreground leading-tight">{s.label}</p>
              <p className={`text-sm font-extrabold ${s.cls}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <RiderRemittance cashDue={cashDue} onSubmitted={load} />

        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2"><Wallet className="w-4 h-4" /> فی آرڈر کمائی</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {earnings.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">ابھی کوئی ریکارڈ نہیں</p>
            ) : earnings.map((e) => (
              <div key={e.id} className="rounded-lg border bg-secondary/20 p-2.5 flex items-center justify-between gap-2">
                <div className="text-xs">
                  <p className="font-mono text-[10px] text-muted-foreground">#{String(e.order_id).slice(0, 8)}</p>
                  <p className="text-muted-foreground">{Number(e.distance_km || 0).toFixed(1)} کلومیٹر • {e.order_kind}</p>
                </div>
                <div className="text-right">
                  <p className="font-extrabold text-success text-sm">Rs {Math.round(Number(e.amount))}</p>
                  <Badge variant="outline" className="text-[10px]">{e.status}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2"><Banknote className="w-4 h-4" /> تنخواہ / پے آؤٹ</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {salaries.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">ابھی کوئی تنخواہ جاری نہیں ہوئی</p>
            ) : salaries.map((s) => (
              <div key={s.id} className="rounded-lg border bg-secondary/20 p-2.5 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{s.period_start} → {s.period_end}</p>
                  <Badge className="bg-success text-success-foreground text-[10px]">Rs {Math.round(Number(s.total))}</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  تنخواہ Rs {Math.round(Number(s.salary_amount))} • آرڈر کمائی Rs {Math.round(Number(s.order_earnings))} • بونس Rs {Math.round(Number(s.bonus))} • کٹوتی Rs {Math.round(Number(s.deduction))}
                </p>
                {s.reference_no && <p className="text-[10px] font-mono text-muted-foreground">Ref: {s.reference_no}</p>}
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="rounded-xl border bg-secondary/20 p-3 text-[11px] leading-relaxed text-muted-foreground flex gap-2">
          <Receipt className="w-4 h-4 shrink-0 text-primary" />
          <span>
            پیٹرول اور موبائل خرچ رائیڈر کے اپنے ذمے ہیں — یہ فی آرڈر فیس اور فی کلومیٹر ریٹ میں شامل کر کے ادا کیے جاتے ہیں۔
            کیش آن ڈلیوری کی پوری رقم EasyLife کو جمع کرانی ہے؛ آپ کی کمائی/تنخواہ الگ سے آپ کے اکاؤنٹ میں بھیجی جاتی ہے۔
          </span>
        </div>
      </div>
    </div>
  );
};

export default RiderPayments;
