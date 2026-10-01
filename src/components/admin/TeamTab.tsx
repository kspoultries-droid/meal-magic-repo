import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserPlus, X, RefreshCw } from "lucide-react";

export const STAFF_ROLES: Record<string, { label: string; desc: string }> = {
  admin: { label: "ایڈمن", desc: "سب کچھ" },
  ops_manager: { label: "آپریشن مینیجر", desc: "آرڈر، ڈسپیچ، رائیڈر، پارٹنر، سپورٹ" },
  dispatcher: { label: "ڈسپیچر", desc: "آرڈر اور رائیڈر اسائنمنٹ" },
  support: { label: "سپورٹ", desc: "آرڈر، شکایات، ریفنڈ درخواست" },
  finance: { label: "فنانس", desc: "ادائیگیاں، کیش وصولی، منظوری" },
  partner_manager: { label: "پارٹنر مینیجر", desc: "دکانیں، مینو، درخواستیں" },
  rider_supervisor: { label: "رائیڈر سپروائزر", desc: "رائیڈر تصدیق، معطلی" },
};

const TeamTab = () => {
  const db = supabase as any;
  const [staff, setStaff] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("dispatcher");
  const [cityIds, setCityIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [{ data, error }, { data: c }] = await Promise.all([db.rpc("list_staff"), db.from("cities").select("id,name").order("name")]);
    if (error) toast.error(error.message);
    setStaff(data || []);
    setCities(c || []);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!email.trim()) return toast.error("ای میل لکھیں");
    setBusy(true);
    const { error } = await db.rpc("staff_add", { _email: email.trim(), _role: role, _city_ids: cityIds });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("عملہ شامل ہو گیا");
    setEmail(""); setCityIds([]); load();
  };

  const remove = async (uid: string, r: string) => {
    if (!window.confirm(`${STAFF_ROLES[r]?.label || r} کا کردار ہٹائیں؟`)) return;
    const { error } = await db.rpc("staff_remove", { _user_id: uid, _role: r });
    if (error) return toast.error(error.message);
    toast.success("کردار ہٹا دیا گیا"); load();
  };

  const cityName = (id: string) => cities.find((c) => c.id === id)?.name || "—";

  return (
    <div className="space-y-4" dir="rtl">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><UserPlus className="h-4 w-4" /> نیا عملہ شامل کریں</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">پہلے وہ شخص ایپ میں اپنا اکاؤنٹ بنائے، پھر اس کی ای میل یہاں لکھیں۔</p>
          <Input placeholder="ای میل" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.entries(STAFF_ROLES).map(([k, v]) => (
              <button key={k} onClick={() => setRole(k)} className={`rounded-xl border p-2 text-start ${role === k ? "border-primary bg-primary/10" : "bg-card"}`}>
                <p className="text-sm font-bold">{v.label}</p>
                <p className="text-[10px] text-muted-foreground">{v.desc}</p>
              </button>
            ))}
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold">شہر (خالی = سب شہر)</p>
            <div className="flex flex-wrap gap-1.5">
              {cities.map((c) => (
                <button key={c.id} onClick={() => setCityIds((p) => p.includes(c.id) ? p.filter((x) => x !== c.id) : [...p, c.id])}
                  className={`rounded-full border px-3 py-1 text-xs ${cityIds.includes(c.id) ? "border-primary bg-primary text-primary-foreground" : ""}`}>{c.name}</button>
              ))}
            </div>
          </div>
          <Button onClick={add} disabled={busy} className="w-full">شامل کریں</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">ٹیم ({staff.length})</CardTitle>
          <Button variant="ghost" size="sm" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {staff.map((s) => (
            <div key={s.user_id} className="rounded-xl border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{s.full_name || s.email}</p>
                  <p className="truncate text-xs text-muted-foreground" dir="ltr">{s.email}</p>
                </div>
                <p className="shrink-0 text-[10px] text-muted-foreground">
                  {s.last_action_at ? `آخری کام: ${new Date(s.last_action_at).toLocaleString("ur-PK")}` : "ابھی کوئی کام نہیں"}
                </p>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(s.roles || []).map((r: string) => (
                  <Badge key={r} variant="secondary" className="gap-1">
                    {STAFF_ROLES[r]?.label || r}
                    <button aria-label="ہٹائیں" onClick={() => remove(s.user_id, r)}><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
                {(s.city_ids || []).length > 0
                  ? s.city_ids.map((c: string) => <Badge key={c} variant="outline">{cityName(c)}</Badge>)
                  : <Badge variant="outline">سب شہر</Badge>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamTab;
