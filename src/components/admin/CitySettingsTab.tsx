import { tr } from "@/lib/i18n/tr";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

interface Row {
  id: string;
  name: string;
  rider_count: number;
  food_enabled: boolean;
  grocery_enabled: boolean;
  wholesale_enabled: boolean;
  auto_hide_without_rider: boolean;
  default_courier: string | null;
  courier_payment_default: string | null;
  courier_advance_percent: number | null;
  auto_dispatch: boolean;
  offer_timeout_seconds: number;
  max_dispatch_km: number;
  max_offers_before_stuck: number;
}

const CitySettingsTab = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: cities }, { data: services }] = await Promise.all([
      supabase.from("cities").select("*").order("name"),
      (supabase.rpc as any)("get_city_services"),
    ]);
    const counts: Record<string, number> = {};
    (services || []).forEach((s: any) => { counts[s.id] = s.rider_count; });
    setRows(((cities || []) as any[]).map((c) => ({ ...c, rider_count: counts[c.id] ?? 0 })));
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const patch = async (id: string, values: Record<string, any>) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...values } : r)));
    const { error } = await supabase.from("cities").update(values as any).eq("id", id);
    if (error) { toast.error(error.message); fetchAll(); return; }
    toast.success(tr("Settings saved ✅", "سیٹنگ محفوظ ہو گئی ✅"));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{tr("City Settings — Services & Courier", "شہر سیٹنگز — سروسز اور کورئیر")}</CardTitle>
        <Button variant="outline" size="sm" onClick={fetchAll}><RefreshCw className="h-4 w-4" /></Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-muted-foreground">{tr("Loading...", "لوڈ ہو رہا ہے...")}</p>
        ) : rows.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">{tr("No cities", "کوئی شہر نہیں")}</p>
        ) : (
          rows.map((c) => {
            const hidden = c.auto_hide_without_rider && c.rider_count === 0;
            return (
              <div key={c.id} className="rounded-xl border p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="font-extrabold">{c.name}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{tr("🏍️ Riders:", "🏍️ رائیڈرز:")} {c.rider_count}</Badge>
                    {hidden && <Badge variant="destructive" className="text-[10px]">{tr("Auto-Close Food/Grocery", "فوڈ/گروسری خودکار بند")}</Badge>}
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {([
                    ["food_enabled", tr("🍔 Food", "🍔 فوڈ")],
                    ["grocery_enabled", tr("🛒 Grocery", "🛒 گروسری")],
                    ["wholesale_enabled", tr("📦 Bazaar (Courier)", "📦 بازار (کورئیر)")],
                    ["auto_hide_without_rider", tr("Auto-hide if no riders", "رائیڈر نہ ہو تو خودکار چھپائیں")],
                  ] as const).map(([key, label]) => (
                    <label key={key} className="flex items-center justify-between rounded-lg bg-secondary/20 px-3 py-2">
                      <span className="text-xs font-bold">{label}</span>
                      <Switch
                        checked={!!(c as any)[key]}
                        onCheckedChange={(v) => patch(c.id, { [key]: v })}
                      />
                    </label>
                  ))}
                </div>

                <div className="rounded-lg bg-secondary/20 p-3">
                  <label className="text-[11px] font-bold text-muted-foreground">{tr("🛒 Grocery delivery limit (KM from shop)", "🛒 گروسری ڈیلیوری حد (دکان سے کلومیٹر)")}</label>
                  <Input type="number" step="0.5" min="1" className="mt-1 h-8 text-xs" defaultValue={String((c as any).grocery_max_km ?? 6)}
                    onBlur={(e) => { const v = Number(e.target.value); if (v > 0 && v !== (c as any).grocery_max_km) patch(c.id, { grocery_max_km: v }); }} />
                  <p className="mt-1 text-[10px] text-muted-foreground">{tr("Customers farther than this cannot order from this city's grocery shops. Old orders are not affected.", "اس سے زیادہ دور کا گاہک اس شہر کی گروسری دکانوں سے آرڈر نہیں کر سکے گا۔ پرانے آرڈرز پر اثر نہیں پڑے گا۔")}</p>
                </div>

                {/* Auto rider dispatch settings */}
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
                  <label className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-primary">{tr("🤖 Auto Rider Assignment (Auto Dispatch)", "🤖 خودکار رائیڈر اسائنمنٹ (Auto Dispatch)")}</span>
                    <Switch checked={!!c.auto_dispatch} onCheckedChange={(v) => patch(c.id, { auto_dispatch: v })} />
                  </label>
                  {c.auto_dispatch && (
                    <div className="grid gap-2 sm:grid-cols-3">
                      <div>
                        <label className="text-[11px] font-bold text-muted-foreground">{tr("Offer Timeout (Seconds)", "آفر ٹائم آؤٹ (سیکنڈ)")}</label>
                        <Input type="number" className="h-8 text-xs" defaultValue={String(c.offer_timeout_seconds ?? 40)}
                          onBlur={(e) => { const v = Number(e.target.value) || 40; if (v !== c.offer_timeout_seconds) patch(c.id, { offer_timeout_seconds: v }); }} />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-muted-foreground">{tr("Max Distance (KM)", "زیادہ سے زیادہ فاصلہ (KM)")}</label>
                        <Input type="number" step="0.5" className="h-8 text-xs" defaultValue={String(c.max_dispatch_km ?? 5)}
                          onBlur={(e) => { const v = Number(e.target.value) || 5; if (v !== c.max_dispatch_km) patch(c.id, { max_dispatch_km: v }); }} />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-muted-foreground">{tr("Stuck after offers", "کتنی آفرز کے بعد Stuck")}</label>
                        <Input type="number" className="h-8 text-xs" defaultValue={String(c.max_offers_before_stuck ?? 5)}
                          onBlur={(e) => { const v = Number(e.target.value) || 5; if (v !== c.max_offers_before_stuck) patch(c.id, { max_offers_before_stuck: v }); }} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground">{tr("Default Courier", "ڈیفالٹ کورئیر")}</label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="TCS / Leopards / M&P"
                      defaultValue={c.default_courier || ""}
                      onBlur={(e) => e.target.value !== (c.default_courier || "") && patch(c.id, { default_courier: e.target.value || null })}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground">{tr("Default Payment", "ادائیگی ڈیفالٹ")}</label>
                    <select
                      className="h-8 w-full rounded-md border bg-background px-2 text-xs"
                      value={c.courier_payment_default || "cod"}
                      onChange={(e) => patch(c.id, { courier_payment_default: e.target.value })}
                    >
                      <option value="cod">{tr("COD (Cash on Delivery)", "COD (ڈلیوری پر ادائیگی)")}</option>
                      <option value="advance">{tr("Advance", "ایڈوانس")}</option>
                      <option value="partial">{tr("Partial Advance", "جزوی ایڈوانس")}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground">{tr("Advance %", "ایڈوانس %")}</label>
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      defaultValue={String(c.courier_advance_percent ?? 0)}
                      onBlur={(e) => {
                        const v = Number(e.target.value) || 0;
                        if (v !== Number(c.courier_advance_percent ?? 0)) patch(c.id, { courier_advance_percent: v });
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};

export default CitySettingsTab;
