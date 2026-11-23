import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { tr } from "@/lib/i18n/tr";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { AdminListTools, AdminPagination } from "./AdminListTools";
import OperationConfirmDialog from "./OperationConfirmDialog";
import { applyOperationFilters, operationRange } from "@/lib/operationsList";
import { PARTNER_ACTIVE_STATUSES, PARTNER_CLOSED_STATUSES, partnerTransitionAllowed } from "@/lib/partnerJobLifecycle";

type Job = { id: string; external_order_no: string; amount: number; cod: boolean; pickup: any; dropoff: any; status: string; created_at: string };

export default function PartnerDeliveryJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [view, setView] = useState("active");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<{ job: Job; status: string } | null>(null);
  const request = useRef(0);
  const load = useCallback(async (showLoading = true) => {
    const seq = ++request.current;
    if (showLoading) setLoading(true);
    const [start, end] = operationRange(page);
    try {
      const result = await applyOperationFilters((supabase as any).from("partner_delivery_jobs").select("*", { count: "exact" }).in("status", view === "active" ? PARTNER_ACTIVE_STATUSES : PARTNER_CLOSED_STATUSES), "", "", query, ["external_order_no", "pickup->>shop_name", "dropoff->>phone"]).order("created_at", { ascending: false }).order("id", { ascending: false }).range(start, end);
      if (result.error) throw result.error;
      if (seq !== request.current) return;
      setJobs(result.data || []); setCount(result.count || 0); setError("");
      const last = Math.max(1, Math.ceil((result.count || 0) / 20));
      if (page > last) setPage(last);
    } catch (err) { if (seq === request.current) setError((err as Error).message); }
    finally { if (seq === request.current) setLoading(false); }
  }, [page, query, view]);
  useEffect(() => { const timer = setTimeout(() => void load(), 300); return () => { clearTimeout(timer); request.current++; }; }, [load]);
  useEffect(() => {
    const timer = setInterval(() => void load(false), 20000);
    const resume = () => { if (document.visibilityState === "visible") void load(false); };
    document.addEventListener("visibilitychange", resume);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", resume); };
  }, [load]);
  const setStatus = async (note: string) => {
    if (!action || !partnerTransitionAllowed(action.job.status, action.status)) throw new Error(tr("This order is closed", "یہ آرڈر بند ہو چکا ہے"));
    // Compare against the captured state: a stale dialog must never overwrite a terminal row.
    // Server lifecycle enforcement and persisted action notes await the migration repair.
    const { data, error } = await (supabase as any).from("partner_delivery_jobs").update({ status: action.status, updated_at: new Date().toISOString() }).eq("id", action.job.id).eq("status", action.job.status).select("id").single();
    if (error || !data) throw new Error(error?.message || tr("Order changed — refresh and retry", "آرڈر بدل چکا ہے — تازہ کر کے دوبارہ کوشش کریں"));
    void note;
    toast.success(tr("Status saved", "اسٹیٹس محفوظ ہو گیا"));
    await load(false);
  };
  return (
    <section className="mb-4 space-y-3 border-b pb-4" aria-label={tr("ApnaHub delivery requests", "ApnaHub ڈیلیوری درخواستیں")}>
      <div className="flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">{tr("ApnaHub delivery requests", "ApnaHub ڈیلیوری درخواستیں")}</h2><Button variant="outline" size="icon" aria-label={tr("Refresh partner requests", "پارٹنر درخواستیں تازہ کریں")} onClick={() => void load(false)}><RefreshCw className="size-4" /></Button></div>
      <div className="flex gap-2">{[["active", tr("Active", "جاری")], ["history", tr("History", "ہسٹری")]].map(([value, label]) => <Button key={value} size="sm" variant={view === value ? "default" : "outline"} aria-pressed={view === value} onClick={() => { setView(value); setPage(1); }}>{label}</Button>)}</div>
      <AdminListTools query={query} onQuery={v => { setQuery(v); setPage(1); }} count={count} />
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      {loading && <p className="text-xs text-muted-foreground">{tr("Loading…", "لوڈ ہو رہا ہے…")}</p>}
      {!loading && !jobs.length && <p className="text-xs text-muted-foreground">{tr("No matching requests", "کوئی متعلقہ درخواست نہیں")}</p>}
      {jobs.map(j => (
        <div key={j.id} className="rounded-lg border p-2 text-xs space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 break-words font-medium">#{j.external_order_no} · {j.pickup?.shop_name || tr("Shop", "دکان")}</span>
            <Badge variant="outline">{j.status}</Badge>
          </div>
          <p className="break-words">{tr("Pickup", "پک اپ")}: {j.pickup?.shop_address || "-"} {j.pickup?.shop_phone && <a className="text-primary" href={`tel:${j.pickup.shop_phone}`}>{j.pickup.shop_phone}</a>}</p>
          <p className="break-words">{tr("Drop", "ڈراپ")}: {j.dropoff?.address || "-"}, {j.dropoff?.city || ""} {j.dropoff?.phone && <a className="text-primary" href={`tel:${j.dropoff.phone}`}>{j.dropoff.phone}</a>}</p>
          <p>Rs {Number(j.amount).toLocaleString("en-PK")} {j.cod ? tr("(COD)", "(نقد وصولی)") : tr("(non-COD)", "(بغیر نقد وصولی)")} · {new Date(j.created_at).toLocaleDateString("en-GB")}</p>
          <div className="flex flex-wrap gap-2">
            {partnerTransitionAllowed(j.status, "assigned") && <Button size="sm" className="h-7 text-[11px]" onClick={() => setAction({ job: j, status: "assigned" })}>{tr("Rider sent", "رائیڈر بھیج دیا")}</Button>}
            {partnerTransitionAllowed(j.status, "delivered") && <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setAction({ job: j, status: "delivered" })}>{tr("Delivered", "ڈیلیور ہو گیا")}</Button>}
            {partnerTransitionAllowed(j.status, "cancelled") && <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => setAction({ job: j, status: "cancelled" })}>{tr("Cancel", "منسوخ")}</Button>}
          </div>
        </div>
      ))}
      <AdminPagination page={page} count={count} onPage={setPage} />
      {action && <OperationConfirmDialog title={`${action.status === "cancelled" ? tr("Cancel request", "درخواست منسوخ کریں") : action.status === "assigned" ? tr("Confirm rider sent", "رائیڈر روانگی کی تصدیق") : tr("Confirm delivery", "ڈیلیوری کی تصدیق")} #${action.job.external_order_no}`} onClose={() => setAction(null)} onConfirm={setStatus} reasons={action.status === "cancelled" ? [tr("Test order", "ٹیسٹ آرڈر"), tr("Customer refused", "کسٹمر نے انکار کیا"), tr("Rider unavailable", "رائیڈر دستیاب نہیں")] : []} />}
    </section>
  );
}
