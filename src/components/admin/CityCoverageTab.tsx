import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { tr } from "@/lib/i18n/tr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Bike, RefreshCw, Store, Truck } from "lucide-react";
import { summarizeCity, type WarningCode } from "@/lib/cityCoverage";

const WARN: Record<WarningCode, [string, string]> = {
  no_riders: ["No registered riders in this city", "اس شہر میں کوئی رجسٹرڈ رائیڈر نہیں"],
  shops_missing_pin: ["Some shops have no pickup location pin", "کچھ دکانوں کا پک اپ مقام (پن) موجود نہیں"],
  nationwide_without_courier_rates: ["Nationwide shops exist but no verified courier rate or route", "ملک گیر دکانیں ہیں مگر کوئی تصدیق شدہ کوریئر ریٹ یا روٹ نہیں"],
  advance_without_gateway: ["Advance payment is set but no online payment gateway exists — such orders fail", "ایڈوانس ادائیگی مقرر ہے مگر آن لائن ادائیگی کا نظام موجود نہیں — ایسے آرڈر ناکام ہوں گے"],
  courier_text_only: ["Default courier is only a saved name; no courier company is connected", "ڈیفالٹ کوریئر صرف لکھا ہوا نام ہے؛ کوئی کوریئر کمپنی منسلک نہیں"],
  no_local_rate: ["No active local delivery rate card", "کوئی فعال مقامی ڈیلیوری ریٹ کارڈ نہیں"],
};

const On = ({ on }: { on: boolean }) => <Badge variant={on ? "default" : "secondary"}>{on ? tr("On", "فعال") : tr("Off", "بند")}</Badge>;

/** Read-only overview of every city's delivery coverage. Editing stays in the existing tabs. */
const CityCoverageTab = () => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState(false);
  const load = async () => {
    setError(false);
    const [c, s, r, ro, sv] = await Promise.all([
      supabase.from("cities").select("*").order("name"),
      supabase.from("grocery_stores").select("city_id,is_active,ships_nationwide,pickup_lat,pickup_lng,advance_percent"),
      supabase.from("delivery_rate_cards").select("city_id,mode,is_active"),
      supabase.from("intercity_routes").select("from_city_id,is_active"),
      (supabase.rpc as any)("get_city_services"),
    ]);
    if (c.error || s.error || r.error || ro.error) { setError(true); return; }
    const riders: Record<string, number> = {};
    (sv.data || []).forEach((x: any) => { riders[x.id] = Number(x.rider_count) || 0; });
    setData({ cities: c.data || [], shops: s.data || [], rates: r.data || [], routes: ro.data || [], riders });
  };
  useEffect(() => { void load(); }, []);

  if (error) return <p className="p-4 text-sm text-destructive">{tr("Could not load city coverage.", "شہروں کی کوریج لوڈ نہیں ہو سکی۔")}</p>;
  if (!data) return <p className="p-4 text-sm text-muted-foreground">{tr("Loading…", "لوڈ ہو رہا ہے…")}</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold">{tr("City delivery coverage", "شہر وار ڈیلیوری کوریج")}</h2>
          <p className="text-xs text-muted-foreground">{tr("Read-only overview. Edit values in City Settings, Delivery Rates and Cities.", "صرف جائزہ۔ تبدیلی سٹی سیٹنگز، ڈیلیوری ریٹس اور شہر والے حصوں میں کریں۔")}</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => void load()}><RefreshCw className="h-4 w-4" /></Button>
      </div>
      <Card className="border-warning/40">
        <CardContent className="p-3 text-xs space-y-1">
          <p className="font-bold">{tr("Platform integrations", "پلیٹ فارم انضمام")}</p>
          <p>{tr("Courier company API (TCS, Leopards, M&P, Trax, PostEx)", "کوریئر کمپنی API (TCS، Leopards، M&P، Trax، PostEx)")}: <Badge variant="outline">{tr("Pending — not connected", "زیرِ التوا — منسلک نہیں")}</Badge></p>
          <p>{tr("Online payment gateway", "آن لائن ادائیگی گیٹ وے")}: <Badge variant="outline">{tr("Pending — cash on delivery only", "زیرِ التوا — صرف ڈیلیوری پر نقد")}</Badge></p>
          <p>{tr("Phone OTP verification", "فون OTP تصدیق")}: <Badge variant="destructive">{tr("Pending — open security issue", "زیرِ التوا — کھلا سیکیورٹی مسئلہ")}</Badge></p>
        </CardContent>
      </Card>
      {data.cities.map((c: any) => {
        const s = summarizeCity(c, data.shops, data.rates, data.routes, data.riders[c.id] || 0);
        return (
          <Card key={c.id} data-testid="coverage-city">
            <CardHeader className="p-4 pb-2"><CardTitle className="text-base flex flex-wrap items-center gap-2">{c.name}{s.warnings.length ? <Badge variant="destructive">{s.warnings.length} {tr("issues", "مسائل")}</Badge> : <Badge>{tr("No issues found", "کوئی مسئلہ نہیں")}</Badge>}</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0 grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-md border p-3 space-y-1">
                <p className="font-bold flex items-center gap-1"><Bike className="h-4 w-4" />{tr("Local rider", "مقامی رائیڈر")}</p>
                <p>{tr("Food", "فوڈ")} <On on={c.food_enabled} /> {tr("Grocery", "گروسری")} <On on={c.grocery_enabled} /></p>
                <p>{tr("Riders", "رائیڈرز")}: {s.riderCount}</p>
                <p>{tr("Shop radius", "دکان کا دائرہ")}: {c.grocery_max_km ?? "—"} km · {tr("Dispatch", "ڈسپیچ")}: {c.max_dispatch_km ?? "—"} km</p>
                <p>{tr("Active local rate cards (incl. nationwide)", "فعال مقامی ریٹ کارڈ (ملک گیر سمیت)")}: {s.localRates}</p>
              </div>
              <div className="rounded-md border p-3 space-y-1">
                <p className="font-bold flex items-center gap-1"><Truck className="h-4 w-4" />{tr("Intercity courier", "انٹرسٹی کوریئر")}</p>
                <p>{tr("Bazar", "بازار")} <On on={c.wholesale_enabled} /></p>
                <p>{tr("Admin courier rate cards (incl. nationwide)", "ایڈمن کوریئر ریٹ کارڈ (ملک گیر سمیت)")}: {s.courierRates} · {tr("Routes", "روٹس")}: {s.activeRoutes}</p>
                <p>{tr("Saved courier name", "محفوظ کوریئر نام")}: {c.default_courier || "—"}</p>
                <p><Badge variant="outline">{tr("Booking API pending", "بکنگ API زیرِ التوا")}</Badge></p>
              </div>
              <div className="rounded-md border p-3 space-y-1">
                <p className="font-bold flex items-center gap-1"><Store className="h-4 w-4" />{tr("Shops", "دکانیں")}</p>
                <p>{tr("Total", "کل")}: {s.shops} · {tr("Active", "فعال")}: {s.activeShops}</p>
                <p>{tr("Ships nationwide", "ملک گیر ترسیل")}: {s.nationwide}</p>
                <p>{tr("Missing pin", "پن موجود نہیں")}: {s.missingPin} · {tr("Advance set", "ایڈوانس مقرر")}: {s.advanceShops}</p>
              </div>
              {s.warnings.length > 0 && (
                <ul className="sm:col-span-3 space-y-1 rounded-md bg-warning/10 p-3 text-xs">
                  {s.warnings.map((w) => <li key={w} className="flex gap-1"><AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" />{tr(WARN[w][0], WARN[w][1])}</li>)}
                </ul>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default CityCoverageTab;
