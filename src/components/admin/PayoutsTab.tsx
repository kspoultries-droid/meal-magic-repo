import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Wallet, RefreshCw, Copy, Paperclip, ReceiptText } from "lucide-react";
import { loadVendorEarnings, periodStart, type Period, type VendorRow } from "@/components/vendor/vendorEarnings";

const PERIODS: { key: Period; label: string }[] = [
  { key: "week", label: "ہفتہ وار (7 دن)" },
  { key: "fortnight", label: "15 دن" },
  { key: "month", label: "ماہانہ (30 دن)" },
];

const SCHEDULE_DAYS: Record<string, number> = { daily: 1, weekly: 7, fortnightly: 15, biweekly: 15, monthly: 30 };
const SCHEDULE_LABEL: Record<string, string> = { daily: "روزانہ", weekly: "ہفتہ وار", fortnightly: "15 دن", biweekly: "15 دن", monthly: "ماہانہ" };

const PayoutsTab = () => {
  const [period, setPeriod] = useState<Period>("week");
  const [rows, setRows] = useState<VendorRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [fromAcc, setFromAcc] = useState<Record<string, string>>({});
  const [toAcc, setToAcc] = useState<Record<string, string>>({});
  const [accounts, setAccounts] = useState<any[]>([]);
  const [vendorAccounts, setVendorAccounts] = useState<Record<string, any[]>>({});
  const [history, setHistory] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<Record<string, string>>({});
  const [lastPaid, setLastPaid] = useState<Record<string, string>>({});
  const [receipts, setReceipts] = useState<Record<string, File | undefined>>({});
  const [onlyDue, setOnlyDue] = useState(false);
  

  const from = periodStart(period);

  /** دن جو اگلی خودکار ادائیگی میں باقی ہیں (0 = آج واجب الادا) */
  const dueInfo = (vendorId: string) => {
    const sched = schedules[vendorId] || "weekly";
    const days = SCHEDULE_DAYS[sched] ?? 7;
    const last = lastPaid[vendorId];
    if (!last) return { days: 0, sched, overdue: true };
    const elapsed = Math.floor((Date.now() - new Date(last).getTime()) / 86400000);
    const left = days - elapsed;
    return { days: Math.max(0, left), sched, overdue: left <= 0 };
  };

  const load = async () => {
    setLoading(true);
    const data = await loadVendorEarnings(from);
    setRows(data);
    const ids = data.map((d) => d.vendorId);
    if (ids.length) {
      const [{ data: profs }, { data: vaccs }, { data: settings }, { data: lastPays }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, phone").in("id", ids),
        supabase.from("vendor_bank_accounts").select("*").in("user_id", ids).eq("is_active", true),
        supabase.from("payout_settings").select("user_id, payout_schedule").in("user_id", ids),
        supabase.from("payouts").select("vendor_id, created_at, status").in("vendor_id", ids)
          .order("created_at", { ascending: false }),
      ]);
      const m: Record<string, string> = {};
      (profs || []).forEach((p: any) => { m[p.id] = `${p.full_name || "—"} ${p.phone ? "• " + p.phone : ""}`; });
      setNames(m);
      const sm: Record<string, string> = {};
      (settings || []).forEach((s: any) => { sm[s.user_id] = s.payout_schedule; });
      setSchedules(sm);
      const lp: Record<string, string> = {};
      (lastPays || []).forEach((p: any) => { if (!lp[p.vendor_id]) lp[p.vendor_id] = p.created_at; });
      setLastPaid(lp);
      const grouped: Record<string, any[]> = {};
      (vaccs || []).forEach((a: any) => { (grouped[a.user_id] ||= []).push(a); });
      setVendorAccounts(grouped);
      setToAcc((prev) => {
        const next = { ...prev };
        Object.entries(grouped).forEach(([vid, list]) => {
          if (!next[vid]) next[vid] = (list.find((x: any) => x.is_default) || list[0]).id;
        });
        return next;
      });
    }
    const [{ data: accs }, { data: hist }] = await Promise.all([
      supabase.from("payment_accounts").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("payouts").select("*").order("created_at", { ascending: false }).limit(25),
    ]);
    setAccounts(accs || []);
    setHistory(hist || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [period]);


  const pay = async (row: VendorRow, silent = false) => {
    const amount = Number(amounts[row.vendorId] || row.pending);
    const source = fromAcc[row.vendorId] || accounts[0]?.id;
    const dest = toAcc[row.vendorId];
    if (!amount || amount <= 0) { if (!silent) toast.error("رقم درست نہیں"); return false; }
    if (!source) { if (!silent) toast.error("EasyLife اکاؤنٹ منتخب کریں"); return false; }
    if (!dest) { if (!silent) toast.error("اس وینڈر نے ابھی اپنا بینک اکاؤنٹ شامل نہیں کیا"); return false; }
    if (!silent) setBusy(row.vendorId);
    const receipt = receipts[row.vendorId];
    let receiptPath: string | null = null;
    if (receipt) {
      if (!receipt.type.startsWith("image/") && receipt.type !== "application/pdf") {
        if (!silent) { setBusy(null); toast.error("رسید تصویر یا PDF ہونی چاہیے"); }
        return false;
      }
      if (receipt.size > 10 * 1024 * 1024) {
        if (!silent) { setBusy(null); toast.error("رسید 10MB سے کم ہونی چاہیے"); }
        return false;
      }
      const ext = (receipt.name.split(".").pop() || "jpg").toLowerCase();
      receiptPath = `${row.vendorId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("payout-receipts").upload(receiptPath, receipt);
      if (uploadError) {
        if (!silent) { setBusy(null); toast.error("رسید اپلوڈ نہیں ہوئی: " + uploadError.message); }
        return false;
      }
    }
    const { data: payoutId, error } = await supabase.rpc("admin_pay_vendor", {
      _vendor_id: row.vendorId,
      _amount: amount,
      _from_account_id: source,
      _vendor_account_id: dest,
      _period_start: from.toISOString().slice(0, 10),
      _period_end: new Date().toISOString().slice(0, 10),
      _reference_no: refs[row.vendorId]?.trim() || null,
      _notes: `${row.shopNames.join(", ")} — کمیشن ${row.commissionRate}%`,
    });
    if (error && receiptPath) {
      await supabase.storage.from("payout-receipts").remove([receiptPath]);
    }
    if (!error && payoutId && receiptPath) {
      const { error: receiptError } = await supabase.from("payouts").update({ receipt_path: receiptPath }).eq("id", payoutId);
      if (receiptError) {
        await supabase.storage.from("payout-receipts").remove([receiptPath]);
        if (!silent) { setBusy(null); toast.error("ادائیگی درج ہوئی مگر رسید منسلک نہیں ہوئی"); }
        return false;
      }
    }
    if (!silent) setBusy(null);
    if (error) { if (!silent) toast.error(error.message); return false; }
    if (!silent) {
      toast.success("ادائیگی ہو گئی — بینک اسٹیٹمنٹ اپڈیٹ ✓");
      setAmounts({ ...amounts, [row.vendorId]: "" });
      setRefs({ ...refs, [row.vendorId]: "" });
      setReceipts({ ...receipts, [row.vendorId]: undefined });
      load();
    }
    return true;
  };

  const dueRows = rows.filter((r) => r.pending > 0 && dueInfo(r.vendorId).overdue);

  const copyPayLine = (r: VendorRow) => {
    const accs = vendorAccounts[r.vendorId] || [];
    const acc = accs.find((a: any) => a.id === toAcc[r.vendorId]) || accs.find((a: any) => a.is_default) || accs[0];
    const amount = amounts[r.vendorId] || String(r.pending);
    const text = [
      `${r.shopNames.join(", ")} — ${names[r.vendorId] || ""}`,
      acc ? `${acc.bank_name || acc.method} | ${acc.account_title || ""} | ${acc.account_number}` : "بینک اکاؤنٹ موجود نہیں",
      `رقم: Rs ${amount}`,
    ].join("\n");
    navigator.clipboard.writeText(text)
      .then(() => toast.success("پیمنٹ تفصیل کاپی ہو گئی — بینک ایپ میں پیسٹ کریں"))
      .catch(() => toast.error("کاپی نہیں ہوئی"));
  };



  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base"><Wallet className="h-4 w-4" /> وینڈر پیمنٹس / کمیشن</CardTitle>
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-3.5 w-3.5" /></Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {PERIODS.map((p) => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border ${period === p.key ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>
                {p.label}
              </button>
            ))}
          </div>

          <div className="rounded-xl border bg-secondary/40 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold">
                پیمنٹ لسٹ — آج واجب الادا: <span className="text-primary">{dueRows.length}</span> وینڈر
                {dueRows.length > 0 && <> • کل Rs {dueRows.reduce((s, r) => s + r.pending, 0)}</>}
              </p>
              <button onClick={() => setOnlyDue(!onlyDue)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${onlyDue ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>
                {onlyDue ? "سب دکھائیں" : "صرف واجب الادا"}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              یہ لسٹ کھولیں، بینک ایپ میں باری باری ہر وینڈر کو پیمنٹ کریں، پھر یہاں ریفرنس نمبر لکھ کر "ادائیگی درج کریں" دبائیں — ریکارڈ اور بینک اسٹیٹمنٹ خودکار اپڈیٹ ہو جائیں گی۔
            </p>
          </div>


          {loading && <p className="text-sm text-muted-foreground">لوڈ ہو رہا ہے…</p>}
          {!loading && rows.length === 0 && <p className="text-sm text-muted-foreground">اس عرصے میں کوئی مکمل آرڈر نہیں</p>}

          {(onlyDue ? dueRows : rows).map((r) => (
            <div key={r.vendorId} className="border rounded-xl p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">{r.shopNames.join("، ")}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{names[r.vendorId] || r.vendorId.slice(0, 8)}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge variant="secondary">{r.orders} آرڈرز</Badge>
                  <Badge variant={dueInfo(r.vendorId).overdue ? "default" : "outline"} className="text-[10px]">
                    {SCHEDULE_LABEL[dueInfo(r.vendorId).sched] || "ہفتہ وار"} •{" "}
                    {dueInfo(r.vendorId).overdue ? "واجب الادا" : `${dueInfo(r.vendorId).days} دن بعد`}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
                <div className="bg-secondary/50 rounded-lg py-1.5"><p className="text-muted-foreground">سیل</p><p className="font-extrabold">Rs {r.gross}</p></div>
                <div className="bg-secondary/50 rounded-lg py-1.5"><p className="text-muted-foreground">کمیشن {r.commissionRate}%</p><p className="font-extrabold text-destructive">− {r.commission}</p></div>
                <div className="bg-secondary/50 rounded-lg py-1.5"><p className="text-muted-foreground">ادا شدہ</p><p className="font-extrabold">Rs {r.paid}</p></div>
                <div className="bg-primary/10 rounded-lg py-1.5"><p className="text-muted-foreground">باقی</p><p className="font-extrabold text-primary">Rs {r.pending}</p></div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <select value={fromAcc[r.vendorId] || accounts[0]?.id || ""} onChange={(e) => setFromAcc({ ...fromAcc, [r.vendorId]: e.target.value })}
                  className="h-9 rounded-md border bg-background px-2 text-xs">
                  {accounts.length === 0 && <option value="">کوئی EasyLife اکاؤنٹ نہیں</option>}
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.label} (Rs {Math.round(Number(a.balance || 0))})</option>)}
                </select>
                <select value={toAcc[r.vendorId] || ""} onChange={(e) => setToAcc({ ...toAcc, [r.vendorId]: e.target.value })}
                  className="h-9 rounded-md border bg-background px-2 text-xs">
                  {(vendorAccounts[r.vendorId] || []).length === 0 && <option value="">وینڈر اکاؤنٹ موجود نہیں</option>}
                  {(vendorAccounts[r.vendorId] || []).map((a) => <option key={a.id} value={a.id}>{a.bank_name || a.method} • {a.account_number}</option>)}
                </select>
              </div>

              <div className="flex gap-2">
                <Input type="number" placeholder={`Rs ${r.pending}`} value={amounts[r.vendorId] || ""}
                  onChange={(e) => setAmounts({ ...amounts, [r.vendorId]: e.target.value })} className="h-9" />
                <Input placeholder="ریفرنس نمبر (بینک ٹرانزیکشن)" value={refs[r.vendorId] || ""}
                  onChange={(e) => setRefs({ ...refs, [r.vendorId]: e.target.value })} className="h-9" />
                <Button size="sm" variant="outline" className="h-9 shrink-0" title="بینک تفصیل کاپی کریں"
                  onClick={() => copyPayLine(r)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <label className="flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed bg-secondary/30 px-3 text-xs font-bold text-muted-foreground">
                <Paperclip className="h-3.5 w-3.5" />
                {receipts[r.vendorId]?.name || "بینک رسید منسلک کریں (تصویر یا PDF)"}
                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setReceipts({ ...receipts, [r.vendorId]: e.target.files?.[0] })} />
              </label>
              <Button size="sm" className="w-full h-9 font-bold" disabled={r.pending <= 0 || busy === r.vendorId} onClick={() => pay(r)}>
                {busy === r.vendorId ? "درج ہو رہا ہے…" : "ادائیگی درج کریں (بینک سے ادا کرنے کے بعد)"}
              </Button>

            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">حالیہ ادائیگیاں</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {history.length === 0 && <p className="text-sm text-muted-foreground">ابھی کوئی ادائیگی نہیں</p>}
          {history.map((h) => (
            <div key={h.id} className="flex items-center justify-between gap-2 text-xs border-b pb-1.5">
              <span className="truncate pr-2">{h.notes || h.vendor_id.slice(0, 8)}{h.reference_no ? ` • ${h.reference_no}` : ""}</span>
              <span className="flex shrink-0 items-center gap-1 font-bold">{h.receipt_path && <ReceiptText className="h-3.5 w-3.5 text-primary" />} Rs {h.amount} • {h.period_start} → {h.period_end}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default PayoutsTab;
