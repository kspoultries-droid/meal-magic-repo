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
    toast.success("سیٹنگ محفوظ ہو گئی ✅");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>شہر سیٹنگز — سروسز اور کورئیر</CardTitle>
        <Button variant="outline" size="sm" onClick={fetchAll}><RefreshCw className="h-4 w-4" /></Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-muted-foreground">لوڈ ہو رہا ہے...</p>
        ) : rows.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">کوئی شہر نہیں</p>
        ) : (
          rows.map((c) => {
            const hidden = c.auto_hide_without_rider && c.rider_count === 0;
            return (
              <div key={c.id} className="rounded-xl border p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="font-extrabold">{c.name}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">🏍️ رائیڈرز: {c.rider_count}</Badge>
                    {hidden && <Badge variant="destructive" className="text-[10px]">فوڈ/گروسری خودکار بند</Badge>}
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {([
                    ["food_enabled", "🍔 فوڈ"],
                    ["grocery_enabled", "🛒 گروسری"],
                    ["wholesale_enabled", "📦 بازار (کورئیر)"],
                    ["auto_hide_without_rider", "رائیڈر نہ ہو تو خودکار چھپائیں"],
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

                <div className="grid gap-2 sm:grid-cols-3">
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground">ڈیفالٹ کورئیر</label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="TCS / Leopards / M&P"
                      defaultValue={c.default_courier || ""}
                      onBlur={(e) => e.target.value !== (c.default_courier || "") && patch(c.id, { default_courier: e.target.value || null })}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground">ادائیگی ڈیفالٹ</label>
                    <select
                      className="h-8 w-full rounded-md border bg-background px-2 text-xs"
                      value={c.courier_payment_default || "cod"}
                      onChange={(e) => patch(c.id, { courier_payment_default: e.target.value })}
                    >
                      <option value="cod">COD (ڈلیوری پر ادائیگی)</option>
                      <option value="advance">ایڈوانس</option>
                      <option value="partial">جزوی ایڈوانس</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground">ایڈوانس %</label>
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
