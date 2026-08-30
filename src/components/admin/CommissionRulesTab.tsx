import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Percent, RefreshCw } from "lucide-react";

interface Rule {
  id: string;
  sector: string;
  label: string | null;
  rate: number;
  min_commission: number;
  max_commission: number | null;
  is_active: boolean;
}

const CommissionRulesTab = () => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("commission_rules").select("*").order("sector");
    setRules((data || []) as unknown as Rule[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const patch = (id: string, key: keyof Rule, value: any) =>
    setRules((rs) => rs.map((r) => (r.id === id ? { ...r, [key]: value } : r)));

  const save = async (r: Rule) => {
    setSaving(r.id);
    const { error } = await supabase.from("commission_rules").update({
      rate: Number(r.rate) || 0,
      min_commission: Number(r.min_commission) || 0,
      max_commission: r.max_commission === null || r.max_commission === ("" as any) ? null : Number(r.max_commission),
      is_active: r.is_active,
    }).eq("id", r.id);
    setSaving(null);
    if (error) { toast.error(error.message); return; }
    toast.success("محفوظ ہو گیا ✓");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base"><Percent className="h-4 w-4" /> کمیشن کی شرحیں</CardTitle>
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-3.5 w-3.5" /></Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-[11px] text-muted-foreground">
            یہ ہر شعبے کی ڈیفالٹ شرح ہے۔ کسی مخصوص وینڈر کی الگ شرح ہو تو وہ (پے آؤٹ سیٹنگز میں) ترجیح پائے گی۔ شرح صرف نئے آرڈرز پر لاگو ہوگی — پرانے ریکارڈز محفوظ رہیں گے۔
          </p>

          {loading && <p className="text-sm text-muted-foreground">لوڈ ہو رہا ہے…</p>}

          {rules.map((r) => (
            <div key={r.id} className="space-y-2 rounded-xl border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold">{r.label || r.sector}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">{r.is_active ? "فعال" : "بند"}</span>
                  <Switch checked={r.is_active} onCheckedChange={(v) => patch(r.id, "is_active", v)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground">شرح %</label>
                  <Input type="number" className="h-9" value={r.rate}
                    onChange={(e) => patch(r.id, "rate", e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">کم از کم Rs</label>
                  <Input type="number" className="h-9" value={r.min_commission}
                    onChange={(e) => patch(r.id, "min_commission", e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">زیادہ سے زیادہ Rs</label>
                  <Input type="number" className="h-9" placeholder="کوئی حد نہیں" value={r.max_commission ?? ""}
                    onChange={(e) => patch(r.id, "max_commission", e.target.value === "" ? null : e.target.value)} />
                </div>
              </div>
              <Button size="sm" className="h-9 w-full font-bold" disabled={saving === r.id} onClick={() => save(r)}>
                {saving === r.id ? "محفوظ ہو رہا ہے…" : "محفوظ کریں"}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default CommissionRulesTab;
