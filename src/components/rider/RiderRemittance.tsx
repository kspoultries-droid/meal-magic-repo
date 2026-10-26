import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Banknote, Upload, Loader2, Landmark } from "lucide-react";

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "زیرِ تصدیق", cls: "bg-warning/15 text-warning border-warning/30" },
  approved: { label: "منظور ✅", cls: "bg-success/15 text-success border-success/30" },
  rejected: { label: "مسترد ❌", cls: "bg-destructive/15 text-destructive border-destructive/30" },
};

const METHOD_LABEL: Record<string, string> = {
  cash: "نقد", easypaisa: "ایزی پیسہ", jazzcash: "جاز کیش", bank: "بینک",
};

interface Props {
  cashDue: number;
  onSubmitted?: () => void;
}

const RiderRemittance = ({ cashDue, onSubmitted }: Props) => {
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!user) return;
    const [{ data: accs }, { data }] = await Promise.all([
      supabase.rpc("list_deposit_accounts" as any),
      supabase.from("rider_remittances").select("*").eq("rider_id", user.id).order("created_at", { ascending: false }).limit(15),
    ]);
    setAccounts(accs || []);
    setAccountId((prev) => prev || accs?.[0]?.id || "");
    setRows(data || []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const pendingExists = rows.some((r) => r.status === "pending");
  const selected = accounts.find((a) => a.id === accountId);

  const submit = async () => {
    if (!user) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error("درست رقم درج کریں"); return; }
    if (!accountId) { toast.error("EasyLife اکاؤنٹ منتخب کریں"); return; }
    if (amt > cashDue) { toast.error(`واجب الادا رقم Rs ${Math.round(cashDue)} سے زیادہ جمع نہیں کرا سکتے`); return; }
    if (pendingExists) { toast.error("آپ کی ایک درخواست پہلے سے زیرِ تصدیق ہے"); return; }
    setBusy(true);
    try {
      let receipt_url: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user.id}/remittance-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("partner-documents").upload(path, file);
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage.from("partner-documents").createSignedUrl(path, 60 * 60 * 24 * 365);
        receipt_url = signed?.signedUrl || path;
      }
      const { error } = await supabase.from("rider_remittances").insert({
        rider_id: user.id,
        amount: amt,
        method: selected?.method || "cash",
        account_id: accountId,
        reference_no: reference.trim() || null,
        note: note.trim() || null,
        receipt_url,
      });
      if (error) throw error;
      toast.success("رقم جمع کرانے کی درخواست بھیج دی گئی — ایڈمن تصدیق کرے گا");
      setAmount(""); setNote(""); setReference(""); setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      load();
      onSubmitted?.();
    } catch (e: any) {
      toast.error(e.message || "مسئلہ آ گیا");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Banknote className="w-4 h-4" /> EasyLife کو رقم جمع کرائیں
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-3 py-2 flex items-center justify-between">
          <span className="text-xs font-bold text-muted-foreground">واجب الادا رقم</span>
          <span className="text-lg font-extrabold text-destructive">Rs {Math.round(cashDue)}</span>
        </div>

        {pendingExists && (
          <p className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-[11px] font-bold text-warning">
            آپ کی ایک درخواست زیرِ تصدیق ہے — تصدیق کے بعد ہی نئی درخواست بھیج سکیں گے۔
          </p>
        )}

        {accounts.length === 0 ? (
          <p className="text-xs text-muted-foreground">ابھی کوئی EasyLife اکاؤنٹ دستیاب نہیں — ایڈمن سے رابطہ کریں۔</p>
        ) : (
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-muted-foreground flex items-center gap-1"><Landmark className="w-3 h-3" /> EasyLife اکاؤنٹ منتخب کریں</p>
            {accounts.map((a) => (
              <button key={a.id} onClick={() => setAccountId(a.id)}
                className={`w-full text-right rounded-xl border p-2.5 ${accountId === a.id ? "border-primary bg-primary/5" : "border-border"}`}>
                <p className="text-sm font-bold">{a.label} <span className="text-[10px] text-muted-foreground">({METHOD_LABEL[a.method] || a.method})</span></p>
                {a.account_number && <p className="text-[11px] text-muted-foreground">{a.bank_name} • {a.account_number}</p>}
                {a.account_title && <p className="text-[11px] text-muted-foreground">{a.account_title}</p>}
              </button>
            ))}
          </div>
        )}

        <Input type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="رقم (Rs)" className="h-10 text-sm" />
        <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="ٹرانزیکشن / ریفرنس نمبر (منفرد)" className="h-10 text-sm" />
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="نوٹ (اختیاری)" className="h-10 text-sm" />

        <label className="flex items-center gap-2 rounded-xl border border-dashed px-3 py-2.5 cursor-pointer text-xs font-bold text-muted-foreground">
          <Upload className="w-4 h-4" />
          {file ? file.name : "رسید / اسکرین شاٹ اٹیچ کریں"}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </label>

        <Button className="w-full h-11 font-extrabold" onClick={submit} disabled={busy || pendingExists || accounts.length === 0}>
          {busy ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> بھیجا جا رہا ہے…</> : "رقم جمع کرائیں"}
        </Button>

        {rows.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <p className="text-[11px] font-bold text-muted-foreground">پچھلی جمع کرائی گئی رقوم</p>
            {rows.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2 border-b pb-1.5 text-xs">
                <div>
                  <p className="font-extrabold">Rs {r.amount}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("ur-PK")} • {METHOD_LABEL[r.method] || r.method}
                    {r.reference_no ? ` • ${r.reference_no}` : ""}
                  </p>
                  {r.admin_note && <p className="text-[10px] text-destructive">{r.admin_note}</p>}
                </div>
                <Badge variant="outline" className={`text-[10px] ${STATUS[r.status]?.cls || ""}`}>
                  {STATUS[r.status]?.label || r.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RiderRemittance;
