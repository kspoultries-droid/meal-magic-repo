import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RefreshCw, Download, Check, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { downloadCsv } from "@/lib/csv";

type ReturnRow = { id: string; kind: string; rider_id: string; delivery_failure_reason: string; return_requested_at: string };
type Review = { id: string; order_id: string; order_kind: string; rider_id: string };
type Report = { offers: Record<string, number>; pickup_wait_minutes: number | null; ready_wait_minutes: number | null; delivery_minutes: number | null; cash_mismatches: number; accounting_reviews: number; returns: ReturnRow[]; review_rows: Review[]; services: { kind: string; orders: number; cancelled: number; delivered: number; waiting_over_10min: number }[] };
const kindName: Record<string, string> = { food: "فوڈ", grocery_cart: "گروسری", grocery_list: "فوٹو لسٹ" };
export default function RiderOperationsPanel() {
  const { isAdmin, permissions } = useAuth();
  const canReturn = isAdmin || permissions.includes("dispatch");
  const canFinance = isAdmin || permissions.includes("finance");
  const [days, setDays] = useState(7);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<{ kind: "return" | "earning"; id: string; orderKind: string } | null>(null);
  const [note, setNote] = useState("");
  const [distance, setDistance] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("rider_operations_report", { _days: days });
    if (error) { setError(error.message); return; }
    setReport(data as unknown as Report); setError("");
  }, [days]);
  useEffect(() => { void load(); const timer = window.setInterval(() => { if (document.visibilityState === "visible") void load(); }, 30000); return () => clearInterval(timer); }, [load]);
  const submit = async () => {
    if (!selected || busy) return;
    setBusy(true);
    const result = selected.kind === "return" ? await supabase.rpc("resolve_rider_return", { _kind: selected.orderKind, _order_id: selected.id, _note: note }) : await supabase.rpc("review_rider_earning", { _earning_id: selected.id, _distance_km: Number(distance), _note: note });
    setBusy(false);
    if (result.error) { toast.error(result.error.message); return; }
    toast.success("تصدیق محفوظ ہو گئی"); setSelected(null); void load();
  };
  const failed = (report?.offers.declined || 0) + (report?.offers.expired || 0);
  const metrics: [string, string | number][] = [
    ["پک اَپ انتظار (منٹ)", report?.pickup_wait_minutes ?? "—"], ["تیاری کے بعد انتظار (منٹ)", report?.ready_wait_minutes ?? "—"],
    ["سفر (منٹ)", report?.delivery_minutes ?? "—"], ["ناکام آفر", failed], ["نقد اختلاف", report?.cash_mismatches ?? "—"], ["کمائی زیرِتصدیق", report?.accounting_reviews ?? "—"],
  ];
  return <section className="space-y-4" dir="rtl">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3"><h2 className="flex items-center gap-2 text-base font-bold"><ShieldCheck className="size-5 text-primary" /> رائیڈر نگرانی — ایک جاری ڈیلیوری</h2><div className="flex flex-wrap gap-2">
      {[1, 7, 30].map(value => <Button key={value} size="sm" variant={days === value ? "default" : "outline"} onClick={() => setDays(value)}>{value} دن</Button>)}
      <Button size="icon" variant="outline" aria-label="نگرانی تازہ کریں" onClick={() => void load()}><RefreshCw /></Button>
      <Button size="icon" variant="outline" aria-label="نگرانی رپورٹ ڈاؤن لوڈ کریں" disabled={!report} onClick={() => { if (report) downloadCsv("rider-pilot-report", ["مدت (دن)", "پیمائش", "نتیجہ"], metrics.map(([name, value]) => [days, name, value])); }}><Download /></Button>
    </div></div>
    {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : !report ? <p className="text-sm text-muted-foreground">لوڈ ہو رہا ہے…</p> : <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">{metrics.map(([label, value]) => <div key={label} className="border-b py-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>)}</div>
      <div className="flex flex-wrap gap-4 text-xs">{[["قبول", "accepted"], ["انکار", "declined"], ["وقت ختم", "expired"], ["منسوخ", "cancelled"], ["جاری آفر", "offered"]].map(([label, key]) => <span key={key}>{label}: <strong>{report.offers[key] || 0}</strong></span>)}</div>
      {report.services.map(row => <div key={row.kind} className="flex flex-wrap justify-between gap-2 border-b py-2 text-xs"><strong>{kindName[row.kind] || row.kind}</strong><span>آرڈرز {row.orders} · پہنچے {row.delivered} · منسوخ {row.cancelled} · 10 منٹ سے زیادہ انتظار {row.waiting_over_10min}</span></div>)}
      <h3 className="pt-2 font-bold">واپسی کی تصدیق</h3>
      {report.returns.length === 0 ? <p className="text-xs text-muted-foreground">کوئی زیرِنگرانی واپسی نہیں</p> : report.returns.map(row => <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><div className="min-w-0"><p className="text-sm font-bold">{kindName[row.kind]} · #{row.id.slice(0, 8)}</p><p className="break-words text-xs text-muted-foreground">{row.delivery_failure_reason}</p></div>{canReturn && <Button size="sm" variant="outline" onClick={() => { setNote(""); setSelected({ kind: "return", id: row.id, orderKind: row.kind }); }}><Check /> سامان واپس ملا</Button>}</div>)}
      <h3 className="pt-2 font-bold">کمائی کا مالی جائزہ</h3>
      {report.review_rows.length === 0 ? <p className="text-xs text-muted-foreground">کوئی کمائی زیرِتصدیق نہیں</p> : report.review_rows.map(row => <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><p className="text-sm">{kindName[row.order_kind]} · #{row.order_id.slice(0, 8)}</p>{canFinance && <Button size="sm" variant="outline" onClick={() => { setNote(""); setDistance(""); setSelected({ kind: "earning", id: row.id, orderKind: row.order_kind }); }}><Check /> فاصلہ اور حساب تصدیق</Button>}</div>)}
    </>}
    <Dialog open={selected !== null} onOpenChange={open => { if (!open && !busy) setSelected(null); }}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>{selected?.kind === "return" ? "سامان کی واپسی تصدیق" : "کمائی اور فاصلہ تصدیق"}</DialogTitle></DialogHeader>
      {selected?.kind === "earning" && <Input aria-label="تصدیق شدہ فاصلہ کلومیٹر" type="number" min="0" max="500" step="0.1" placeholder="تصدیق شدہ کلومیٹر" value={distance} onChange={e => setDistance(e.target.value)} />}
      <Input aria-label="تصدیق کا نوٹ" placeholder="تصدیق کا نوٹ" value={note} onChange={e => setNote(e.target.value)} />
      <Button disabled={busy || note.trim().length < 3 || (selected?.kind === "earning" && (distance.trim() === "" || !Number.isFinite(Number(distance)) || Number(distance) < 0 || Number(distance) > 500))} onClick={() => void submit()}><Check /> {busy ? "محفوظ ہو رہا ہے…" : "تصدیق محفوظ کریں"}</Button>
    </DialogContent></Dialog>
  </section>;
}