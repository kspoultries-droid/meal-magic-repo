import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminListTools, AdminPagination } from "./AdminListTools";
import { Bike, RefreshCw, Wallet, Pencil } from "lucide-react";

interface Plan {
  id: string;
  rider_id: string | null;
  city_id: string | null;
  pay_type: string;
  monthly_salary: number;
  per_order_fee: number;
  per_km_fee: number;
  min_order_pay: number;
  is_active: boolean;
}

const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const today = () => new Date().toISOString().slice(0, 10);

const RiderPayTab = ({ initialQuery = "" }: { initialQuery?: string }) => {
  const [query, setQuery] = useState(initialQuery);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<{ id: string; mode: "plan" | "pay" } | null>(null);
  const [confirmPay, setConfirmPay] = useState(false);
  useEffect(() => { setQuery(initialQuery); setPage(1); }, [initialQuery]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<Record<string, number>>({});
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [form, setForm] = useState<Record<string, any>>({});
  const set = (rid: string, key: string, val: any) =>
    setForm((f) => ({ ...f, [rid]: { ...(f[rid] || {}), [key]: val } }));

  const load = async () => {
    setLoading(true);
    const [planResult, riderResult, accountResult, earningResult] = await Promise.all([
      supabase.from("rider_pay_plans").select("*"),
      supabase.from("riders").select("id, city_id, wallet_balance, total_earnings").limit(200),
      supabase.from("payment_accounts").select("id, label, balance, is_active").eq("is_active", true),
      supabase.from("rider_earnings").select("rider_id, amount").eq("status", "pending").limit(5000),
    ]);
    if ([planResult, riderResult, accountResult, earningResult].some(result => result.error)) {
      toast.error("ادائیگی کی تفصیل مکمل نہیں آئی؛ دوبارہ تازہ کریں۔");
      setLoading(false);
      return;
    }
    const { data: pl } = planResult;
    const { data: rd } = riderResult;
    const { data: acc } = accountResult;
    const { data: earn } = earningResult;
    setPlans((pl || []) as unknown as Plan[]);
    setRiders(rd || []);
    setAccounts(acc || []);
    const sums: Record<string, number> = {};
    (earn || []).forEach((e: any) => { sums[e.rider_id] = (sums[e.rider_id] || 0) + Number(e.amount || 0); });
    setPending(sums);
    const ids = (rd || []).map((r: any) => r.id);
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, phone").in("id", ids);
      const m: Record<string, string> = {};
      (profs || []).forEach((p: any) => { m[p.id] = `${p.full_name || "رائیڈر"}${p.phone ? ` • ${p.phone}` : ""}`; });
      setNames(m);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const globalPlan = plans.find((p) => !p.rider_id && !p.city_id) || null;
  const planFor = (rid: string) => plans.find((p) => p.rider_id === rid) || null;

  const savePlan = async (rid: string | null) => {
    const key = rid || "global";
    const existing = rid ? planFor(rid) : globalPlan;
    const f = form[key] || {};
    const payload = {
      pay_type: f.pay_type ?? existing?.pay_type ?? "per_order",
      monthly_salary: Number(f.monthly_salary ?? existing?.monthly_salary ?? 0) || 0,
      per_order_fee: Number(f.per_order_fee ?? existing?.per_order_fee ?? 0) || 0,
      per_km_fee: Number(f.per_km_fee ?? existing?.per_km_fee ?? 0) || 0,
      min_order_pay: Number(f.min_order_pay ?? existing?.min_order_pay ?? 0) || 0,
      is_active: true,
    };
    setBusy(key);
    const { error } = existing
      ? await supabase.from("rider_pay_plans").update(payload).eq("id", existing.id)
      : await supabase.from("rider_pay_plans").insert({ ...payload, rider_id: rid });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("پے پلان محفوظ ✓");
    load();
  };

  const payRider = async (rid: string) => {
    const f = form[`pay_${rid}`] || {};
    if (busy) return;
    setBusy(`pay_${rid}`);
    const { error } = await supabase.rpc("pay_rider", {
      _rider: rid,
      _period_start: f.from || monthStart(),
      _period_end: f.to || today(),
      _salary: Number(f.salary ?? planFor(rid)?.monthly_salary ?? globalPlan?.monthly_salary ?? 0) || 0,
      _bonus: Number(f.bonus || 0) || 0,
      _deduction: Number(f.deduction || 0) || 0,
      _from_account_id: f.account || null,
      _reference_no: f.ref || null,
      _note: f.note || null,
    });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    setSelected(null); setConfirmPay(false);
    toast.success("رائیڈر کو ادائیگی ہو گئی ✅");
    load();
  };

  const planFields = (key: string, existing: Plan | null) => {
    const f = form[key] || {};
    const v = (k: keyof Plan) => (f[k] ?? existing?.[k] ?? (k === "pay_type" ? "per_order" : 0)) as any;
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          <div>
            <label className="text-[10px] text-muted-foreground">ادائیگی کی قسم</label>
            <select
              className="h-8 w-full rounded-md border bg-background px-2 text-xs"
              value={v("pay_type")}
              onChange={(e) => set(key, "pay_type", e.target.value)}
            >
              <option value="per_order">صرف فی آرڈر</option>
              <option value="salaried">صرف ماہانہ تنخواہ</option>
              <option value="hybrid">تنخواہ + فی آرڈر</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">ماہانہ تنخواہ Rs</label>
            <Input type="number" min="0" className="h-8" value={v("monthly_salary")} onChange={(e) => set(key, "monthly_salary", e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">فی آرڈر Rs</label>
            <Input type="number" min="0" className="h-8" value={v("per_order_fee")} onChange={(e) => set(key, "per_order_fee", e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">فی کلومیٹر Rs</label>
            <Input type="number" min="0" className="h-8" value={v("per_km_fee")} onChange={(e) => set(key, "per_km_fee", e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">کم از کم فی آرڈر Rs</label>
            <Input type="number" min="0" className="h-8" value={v("min_order_pay")} onChange={(e) => set(key, "min_order_pay", e.target.value)} />
          </div>
        </div>
        <Button size="sm" className="h-8 w-full font-bold md:w-auto md:px-6" disabled={busy === key} onClick={() => savePlan(key === "global" ? null : key)}>
          {busy === key ? "محفوظ ہو رہا ہے…" : "پے پلان محفوظ کریں"}
        </Button>
      </div>
    );
  };

  const filtered = riders.filter(r => `${r.id} ${names[r.id] || ""}`.toLowerCase().includes(query.trim().toLowerCase()));
  const selectedRider = riders.find(r => r.id === selected?.id);
  const paymentFields = (r: any) => {
    const p = planFor(r.id);
    const f = form[`pay_${r.id}`] || {};
    return (                <div className="space-y-2 rounded-lg bg-secondary/40 p-2">
                  <p className="text-[11px] font-bold">تنخواہ / کمائی ادا کریں</p>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                    <div>
                      <label className="text-[10px] text-muted-foreground">مدت — سے</label>
                      <Input type="date" className="h-8" value={f.from || monthStart()} onChange={(e) => set(`pay_${r.id}`, "from", e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">تک</label>
                      <Input type="date" className="h-8" value={f.to || today()} onChange={(e) => set(`pay_${r.id}`, "to", e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">تنخواہ Rs</label>
                      <Input type="number" min="0" className="h-8" value={f.salary ?? (p?.monthly_salary ?? globalPlan?.monthly_salary ?? 0)} onChange={(e) => set(`pay_${r.id}`, "salary", e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">بونس Rs</label>
                      <Input type="number" min="0" className="h-8" value={f.bonus || ""} onChange={(e) => set(`pay_${r.id}`, "bonus", e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">کٹوتی Rs</label>
                      <Input type="number" min="0" className="h-8" value={f.deduction || ""} onChange={(e) => set(`pay_${r.id}`, "deduction", e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">ریفرنس نمبر</label>
                      <Input className="h-8" value={f.ref || ""} onChange={(e) => set(`pay_${r.id}`, "ref", e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">کس اکاؤنٹ سے</label>
                    <select
                      className="h-8 w-full rounded-md border bg-background px-2 text-xs"
                      value={f.account || ""}
                      onChange={(e) => set(`pay_${r.id}`, "account", e.target.value || null)}
                    >
                      <option value="">— اکاؤنٹ منتخب کریں —</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.label} (Rs {Math.round(Number(a.balance || 0))})</option>
                      ))}
                    </select>
                  </div>
                  <Button size="sm" className="h-8 w-full font-bold" disabled={busy === `pay_${r.id}`} onClick={() => setConfirmPay(true)}>
                    {busy === `pay_${r.id}` ? "ادائیگی ہو رہی ہے…" : `ادائیگی کریں (کمائی Rs ${Math.round(pending[r.id] || 0)} + تنخواہ)`}
                  </Button>
                </div>
);
  };
  return <section className="space-y-3" dir="rtl">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2"><h2 className="flex items-center gap-2 font-bold"><Bike className="size-4" /> رائیڈر پلان اور ادائیگی</h2><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setSelected({ id: "global", mode: "plan" })}><Pencil className="size-3.5" /> ڈیفالٹ پلان</Button><Button size="icon" variant="outline" aria-label="ادائیگی فہرست تازہ کریں" onClick={() => void load()}><RefreshCw className="size-4" /></Button></div></div>
    <AdminListTools query={query} onQuery={v => { setQuery(v); setPage(1); }} count={filtered.length} />
    {loading ? <p className="text-xs text-muted-foreground">لوڈ ہو رہا ہے…</p> : filtered.length === 0 ? <p className="text-xs text-muted-foreground">کوئی رائیڈر نہیں ملا</p> : <div className="divide-y border-y">{filtered.slice((page - 1) * 20, page * 20).map(r => <div key={r.id} className="grid items-center gap-2 py-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]"><div className="min-w-0"><p className="truncate text-sm font-semibold">{names[r.id] || r.id.slice(0, 8)}</p><Badge variant="outline" className="text-[10px]">{planFor(r.id) ? "الگ پلان" : "ڈیفالٹ"}</Badge></div><div className="flex gap-4 text-xs"><span>واجب الادا <strong className="text-success">Rs {Math.round(pending[r.id] || 0)}</strong></span><span>نقد Rs {Math.round(Number(r.wallet_balance || 0))}</span></div><div className="flex gap-1"><Button size="sm" variant="outline" onClick={() => setSelected({ id: r.id, mode: "plan" })}><Pencil className="size-3" /> پلان</Button><Button size="sm" onClick={() => { setConfirmPay(false); setSelected({ id: r.id, mode: "pay" }); }}><Wallet className="size-3" /> ادائیگی</Button></div></div>)}</div>}
    <AdminPagination page={page} count={filtered.length} onPage={setPage} />
    <Dialog open={selected !== null} onOpenChange={open => { if (!open && !busy) { setSelected(null); setConfirmPay(false); } }}><DialogContent aria-describedby={undefined} className="max-h-[85dvh] max-w-xl overflow-y-auto" dir="rtl"><DialogHeader><DialogTitle>{selected?.mode === "plan" ? "پے پلان" : "رائیڈر کی ادائیگی"} — {selected?.id === "global" ? "ڈیفالٹ" : names[selected?.id || ""]}</DialogTitle></DialogHeader>
      {selected?.mode === "plan" && planFields(selected.id, selected.id === "global" ? globalPlan : planFor(selected.id))}
      {selected?.mode === "pay" && selectedRider && (!confirmPay ? paymentFields(selectedRider) : <div className="space-y-3"><p className="text-sm font-bold">ادائیگی کی حتمی تصدیق</p><p className="text-xs">واجب الادا کمائی: Rs {Math.round(pending[selectedRider.id] || 0)} · تنخواہ: Rs {Number(form[`pay_${selectedRider.id}`]?.salary ?? planFor(selectedRider.id)?.monthly_salary ?? globalPlan?.monthly_salary ?? 0)}</p><p className="text-xs text-muted-foreground">بونس: Rs {Number(form[`pay_${selectedRider.id}`]?.bonus || 0)} · کٹوتی: Rs {Number(form[`pay_${selectedRider.id}`]?.deduction || 0)}</p><div className="flex gap-2"><Button disabled={busy !== null} onClick={() => void payRider(selectedRider.id)}>{busy ? "ادائیگی ہو رہی ہے…" : "تصدیق اور ادائیگی"}</Button><Button variant="outline" disabled={busy !== null} onClick={() => setConfirmPay(false)}>واپس</Button></div></div>)}
    </DialogContent></Dialog>
  </section>;
};

export default RiderPayTab;
