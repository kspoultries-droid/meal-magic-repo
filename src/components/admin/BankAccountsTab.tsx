import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Landmark, RefreshCw, Plus, ArrowDownLeft, ArrowUpRight } from "lucide-react";

const METHODS = [
  { value: "cash", label: "نقد (آفس)" },
  { value: "easypaisa", label: "ایزی پیسہ" },
  { value: "jazzcash", label: "جاز کیش" },
  { value: "bank", label: "بینک" },
];

const emptyForm = { label: "", method: "bank", bank_name: "", account_title: "", account_number: "" };

const BankAccountsTab = () => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data: accs } = await supabase.from("payment_accounts").select("*").order("sort_order").order("created_at");
    setAccounts(accs || []);
    let q = supabase.from("bank_ledger").select("*").order("created_at", { ascending: false }).limit(150);
    if (filter !== "all") q = q.eq("account_id", filter);
    const { data: led } = await q;
    setLedger(led || []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const save = async () => {
    if (!form.label.trim()) { toast.error("اکاؤنٹ کا نام درج کریں"); return; }
    setBusy(true);
    const { error } = await supabase.from("payment_accounts").insert({
      label: form.label.trim(),
      method: form.method,
      bank_name: form.bank_name.trim() || null,
      account_title: form.account_title.trim() || null,
      account_number: form.account_number.trim() || null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("اکاؤنٹ شامل ہو گیا ✓");
    setForm(emptyForm); setShowForm(false); load();
  };

  const toggle = async (a: any) => {
    const { error } = await supabase.from("payment_accounts").update({ is_active: !a.is_active }).eq("id", a.id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const total = accounts.reduce((s, a) => s + Number(a.balance || 0), 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Landmark className="h-4 w-4" /> EasyLife بینک اکاؤنٹس</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-3.5 w-3.5" /></Button>
            <Button size="sm" onClick={() => setShowForm((s) => !s)}><Plus className="h-3.5 w-3.5" /></Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-xl bg-primary/10 px-3 py-2 flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">کل بیلنس</span>
            <span className="text-lg font-extrabold text-primary">Rs {Math.round(total)}</span>
          </div>

          {showForm && (
            <div className="rounded-xl border p-3 space-y-2">
              <Input placeholder="اکاؤنٹ کا نام (مثلاً میزان مین اکاؤنٹ)" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="h-9 text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} className="h-9 rounded-md border bg-background px-2 text-sm">
                  {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <Input placeholder="بینک کا نام" value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} className="h-9 text-sm" />
              </div>
              <Input placeholder="اکاؤنٹ ٹائٹل" value={form.account_title} onChange={(e) => setForm({ ...form, account_title: e.target.value })} className="h-9 text-sm" />
              <Input placeholder="اکاؤنٹ / موبائل نمبر" value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} className="h-9 text-sm" />
              <Button size="sm" className="w-full font-bold" disabled={busy} onClick={save}>محفوظ کریں</Button>
            </div>
          )}

          {accounts.length === 0 && <p className="text-sm text-muted-foreground">ابھی کوئی اکاؤنٹ شامل نہیں</p>}
          {accounts.map((a) => (
            <div key={a.id} className="rounded-xl border p-3 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-sm">{a.label} <Badge variant="outline" className="text-[10px]">{METHODS.find((m) => m.value === a.method)?.label || a.method}</Badge></p>
                <p className="text-[11px] text-muted-foreground truncate">{a.bank_name} {a.account_number ? `• ${a.account_number}` : ""}</p>
                <p className="text-[11px] text-muted-foreground">{a.account_title}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-extrabold text-primary">Rs {Math.round(Number(a.balance || 0))}</p>
                <button onClick={() => toggle(a)} className="text-[11px] font-bold text-muted-foreground underline">
                  {a.is_active ? "غیر فعال کریں" : "فعال کریں"}
                </button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">EasyLife بینک اسٹیٹمنٹ</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
            <option value="all">تمام اکاؤنٹس</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>

          {ledger.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">ابھی کوئی ٹرانزیکشن نہیں</p>}
          {ledger.map((l) => (
            <div key={l.id} className="border-b pb-2 flex items-start justify-between gap-2 text-xs">
              <div className="min-w-0">
                <p className="font-bold flex items-center gap-1">
                  {l.direction === "in" ? <ArrowDownLeft className="h-3 w-3 text-success" /> : <ArrowUpRight className="h-3 w-3 text-destructive" />}
                  {l.source_type === "rider_remittance" ? "رائیڈر سے وصولی" : l.source_type === "vendor_payout" ? "دکاندار کو ادائیگی" : l.source_type}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {l.counterparty_label} {l.destination_account ? `→ ${l.destination_account}` : ""}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(l.created_at).toLocaleString("ur-PK")} {l.reference_no ? `• ${l.reference_no}` : ""}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className={`font-extrabold ${l.direction === "in" ? "text-success" : "text-destructive"}`}>
                  {l.direction === "in" ? "+" : "−"} Rs {Math.round(Number(l.amount))}
                </p>
                <p className="text-[10px] text-muted-foreground">بیلنس: Rs {Math.round(Number(l.balance_after))}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default BankAccountsTab;
