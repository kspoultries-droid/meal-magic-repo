import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Landmark, Plus, Trash2 } from "lucide-react";

const METHODS = [
  { value: "bank", label: "بینک" },
  { value: "easypaisa", label: "ایزی پیسہ" },
  { value: "jazzcash", label: "جاز کیش" },
];

const emptyForm = { method: "bank", bank_name: "", account_title: "", account_number: "" };

const VendorBankAccounts = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("vendor_bank_accounts").select("*").eq("user_id", user.id).order("created_at");
    setRows(data || []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const save = async () => {
    if (!user) return;
    if (!form.account_title.trim() || !form.account_number.trim()) { toast.error("ٹائٹل اور اکاؤنٹ نمبر لازمی ہے"); return; }
    setBusy(true);
    const { error } = await supabase.from("vendor_bank_accounts").insert({
      user_id: user.id,
      method: form.method,
      bank_name: form.bank_name.trim() || null,
      account_title: form.account_title.trim(),
      account_number: form.account_number.trim(),
      is_default: rows.length === 0,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("اکاؤنٹ محفوظ ہو گیا ✓");
    setForm(emptyForm); setShowForm(false); load();
  };

  const makeDefault = async (id: string) => {
    if (!user) return;
    await supabase.from("vendor_bank_accounts").update({ is_default: false }).eq("user_id", user.id);
    await supabase.from("vendor_bank_accounts").update({ is_default: true }).eq("id", id);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("vendor_bank_accounts").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base"><Landmark className="h-4 w-4" /> میرے بینک اکاؤنٹس</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setShowForm((s) => !s)}><Plus className="h-3.5 w-3.5" /></Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-[11px] text-muted-foreground">ایڈمن آپ کی ادائیگی انہی اکاؤنٹس میں کرے گا۔ درست معلومات درج کریں۔</p>

        {showForm && (
          <div className="rounded-xl border p-3 space-y-2">
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

        {rows.length === 0 && <p className="text-sm text-muted-foreground">ابھی کوئی اکاؤنٹ شامل نہیں</p>}
        {rows.map((r) => (
          <div key={r.id} className="rounded-xl border p-3 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold text-sm truncate">{r.account_title} {r.is_default && <Badge className="text-[10px]">ڈیفالٹ</Badge>}</p>
              <p className="text-[11px] text-muted-foreground truncate">{r.bank_name} • {r.account_number}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!r.is_default && <button onClick={() => makeDefault(r.id)} className="text-[11px] font-bold underline text-muted-foreground">ڈیفالٹ بنائیں</button>}
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default VendorBankAccounts;
