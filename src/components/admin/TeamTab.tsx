import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { UserPlus, X, RefreshCw, MapPin, Wrench } from "lucide-react";

export const STAFF_ROLES: Record<string, { label: string; desc: string }> = {
  admin: { label: "ایڈمن", desc: "سب کچھ" },
  ops_manager: { label: "آپریشن مینیجر", desc: "آرڈر، ڈسپیچ، رائیڈر، پارٹنر، سپورٹ" },
  dispatcher: { label: "ڈسپیچر", desc: "آرڈر اور رائیڈر اسائنمنٹ" },
  support: { label: "سپورٹ", desc: "آرڈر، شکایات، ریفنڈ درخواست" },
  finance: { label: "فنانس", desc: "ادائیگیاں، کیش وصولی، منظوری" },
  partner_manager: { label: "پارٹنر مینیجر", desc: "دکانیں، مینو، درخواستیں" },
  rider_supervisor: { label: "رائیڈر سپروائزر", desc: "رائیڈر تصدیق، معطلی" },
  service_manager: { label: "سروس سپروائزر", desc: "مقررہ شعبوں کے کاریگر اور کام" },
};

const TeamTab = () => {
  const db = supabase as any;
  const navigate = useNavigate();
  const [scopeUser, setScopeUser] = useState<string | null>(null);
  const [scopeCities, setScopeCities] = useState<string[]>([]);
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

  const saveScope = async () => {
    if (!scopeUser || busy) return;
    setBusy(true);
    const { error } = await db.rpc("staff_set_cities", { _user_id: scopeUser, _city_ids: scopeCities });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("شہر کی اجازت محفوظ ہو گئی"); setScopeUser(null); await load();
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
              <Button variant="outline" key={k} onClick={() => setRole(k)} className={`h-auto flex-col items-start whitespace-normal rounded-md border p-2 text-start ${role === k ? "border-primary bg-primary/10" : "bg-card"}`}>
                <p className="text-sm font-bold">{v.label}</p>
                <p className="text-[10px] text-muted-foreground">{v.desc}</p>
              </Button>
            ))}
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold">شہر (خالی = سب شہر)</p>
            <div className="flex flex-wrap gap-1.5">
              {cities.map((c) => (
                <Button variant="outline" size="sm" key={c.id} onClick={() => setCityIds((p) => p.includes(c.id) ? p.filter((x) => x !== c.id) : [...p, c.id])}
                  className={`rounded-full border px-3 py-1 text-xs ${cityIds.includes(c.id) ? "border-primary bg-primary text-primary-foreground" : ""}`}>{c.name}</Button>
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
                    {s.user_id !== "52634431-32e8-4bd7-b171-d92c2add25ff" && <Button variant="ghost" size="icon" className="h-5 w-5" aria-label="ہٹائیں" onClick={() => remove(s.user_id, r)}><X className="h-3 w-3" /></Button>}
                  </Badge>
                ))}
                {(s.city_ids || []).length > 0
                  ? s.city_ids.map((c: string) => <Badge key={c} variant="outline">{cityName(c)}</Badge>)
                  : <Badge variant="outline">سب شہر</Badge>}
                {s.user_id !== "52634431-32e8-4bd7-b171-d92c2add25ff" && <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => { setScopeUser(s.user_id); setScopeCities(s.city_ids || []); }}><MapPin className="size-3" /> شہر کی اجازت</Button>}
                {(s.roles || []).includes("service_manager") && <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => navigate("/service-manager-dashboard")}><Wrench className="size-3" /> خدمات کی نگرانی</Button>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Dialog open={scopeUser !== null} onOpenChange={open => !open && setScopeUser(null)}><DialogContent dir="rtl"><DialogHeader><DialogTitle>شہر کی اجازت</DialogTitle></DialogHeader><p className="text-xs text-muted-foreground">کوئی شہر منتخب نہ ہو تو سب شہروں کی اجازت ہوگی۔</p><div className="flex flex-wrap gap-2">{cities.map(c => <Button key={c.id} variant={scopeCities.includes(c.id) ? "default" : "outline"} size="sm" onClick={() => setScopeCities(current => current.includes(c.id) ? current.filter(id => id !== c.id) : [...current,c.id])}>{c.name}</Button>)}</div><Button disabled={busy} onClick={saveScope}>محفوظ کریں</Button></DialogContent></Dialog>
    </div>
  );
};

export default TeamTab;
