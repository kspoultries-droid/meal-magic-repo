import { tr } from "@/lib/i18n/tr";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { staffActivityStart } from "@/lib/staffActivityPeriod";

const ENTITY: Record<string, string> = {
  orders: tr("Food order", "فوڈ آرڈر"), grocery_cart_orders: tr("Grocery order", "گروسری آرڈر"), riders: tr("Rider", "رائیڈر"), restaurants: tr("Restaurant", "ریسٹورنٹ"),
  grocery_stores: tr("Shop", "دکان"), payouts: tr("Payment", "ادائیگی"), refunds: tr("Refund", "ریفنڈ"), rider_remittances: tr("Cash Collection", "کیش وصولی"),
  user_roles: tr("Role", "کردار"), partner_applications: tr("Request", "درخواست"), approval_requests: tr("Approval", "منظوری"), staff_scopes: tr("City", "شہر"),
};
const ACTION: Record<string, string> = { insert: tr("Created", "بنایا"), update: tr("Changed", "بدلا"), delete: tr("Removed", "ہٹایا"), approve: tr("Approved", "منظور کیا"), reject: tr("Rejected", "مسترد کیا"), request: tr("Requested", "درخواست دی") };

const safeCell = (v: unknown) => {
  const s = String(v ?? "");
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
};
const toCsv = (rows: any[]) => {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  return [keys.join(","), ...rows.map((r) => keys.map((k) => `"${safeCell(r[k]).replace(/"/g, '""')}"`).join(","))].join("\n");
};

const TeamActivityTab = () => {
  const db = supabase as any;
  const { permissions } = useAuth();
  const [days, setDays] = useState(1);
  const [perf, setPerf] = useState<any[]>([]);
  const [log, setLog] = useState<any[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);

  const load = async () => {
    const tasks: Promise<any>[] = [
      db.from("staff_business_activity").select("*", { count: "exact" }).gte("created_at", staffActivityStart(days)).order("created_at", { ascending: false }).order("id").range((page - 1) * 30,page * 30 - 1),
    ];
    if (permissions.includes("team")) tasks.push(db.rpc("team_performance", { _days: days }));
    const [l, p] = await Promise.all(tasks);
    if (l.error) toast.error(l.error.message);
    if (p?.error) toast.error(p.error.message);
    setLog(l.data || []);
    setCount(l.count || 0);
    const pd = p?.data || [];
    setPerf(pd);
    const m: Record<string, string> = {};
    pd.forEach((r: any) => { m[r.actor_id] = r.full_name || r.email; });
    const missing = [...new Set((l.data || []).map((r: any) => r.actor_id).filter((id: string) => id && !m[id]))];
    if (missing.length) {
      const { data: profs } = await db.from("profiles").select("id, full_name").in("id", missing);
      (profs || []).forEach((x: any) => { m[x.id] = x.full_name || x.id.slice(0, 8); });
    }
    setNames(m);
  };
  useEffect(() => { load(); }, [days, page]);

  const exportCsv = async () => {
    const { error } = await supabase.rpc("staff_log_report_access", { _report: "team", _count: perf.length });
    if (error) return toast.error(error.message);
    const blob = new Blob(["\ufeff" + toCsv(perf.map((r) => ({ staff: r.full_name || r.email, total_actions: r.total_actions, order_actions: r.order_actions, rider_actions: r.rider_actions, finance_actions: r.finance_actions, approvals: r.approvals, last: r.last_action_at })))], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `team-performance-${days}d.csv`; a.click();
  };

  return (
    <div className="space-y-4" dir="rtl">
      {permissions.includes("team") && (
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-base">{tr("Team Activity", "ٹیم کی کارروائیاں")}</CardTitle>
            <div className="flex items-center gap-1">
              {[1, 7, 30].map((d) => (
                <Button key={d} size="sm" variant={days === d ? "default" : "outline"} onClick={() => { setPage(1); setDays(d); }} className="h-7 px-2.5 text-xs">{d === 1 ? tr("Today", "آج") : `${d} ${tr("Day", "دن")}`}</Button>
              ))}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={exportCsv}><Download className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {perf.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">{tr("No activity recorded for this period", "اس مدت میں کوئی کام ریکارڈ نہیں")}</p>}
            {perf.map((r) => (
              <div key={r.actor_id} className="rounded-xl border p-3">
                <div className="flex items-center justify-between">
                  <span className="truncate text-sm font-bold">{r.full_name || r.email}</span>
                  <span className="text-end"><span className="block text-lg font-extrabold text-primary">{r.total_actions}</span><span className="text-[10px] text-muted-foreground">{tr("Total Actions", "کل کارروائیاں")}</span></span>
                </div>
                <div className="mt-1 grid grid-cols-4 gap-1 text-center text-[10px] text-muted-foreground">
                  <div><p className="text-sm font-bold text-foreground">{r.order_actions}</p>{tr("Order Actions", "آرڈر کارروائیاں")}</div>
                  <div><p className="text-sm font-bold text-foreground">{r.rider_actions}</p>{tr("Rider Actions", "رائیڈر کارروائیاں")}</div>
                  <div><p className="text-sm font-bold text-foreground">{r.finance_actions}</p>{tr("Finance", "فنانس")}</div>
                  <div><p className="text-sm font-bold text-foreground">{r.approvals}</p>{tr("Approval", "منظوری")}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">{tr("Staff Activity Log", "عملے کے کاموں کا ریکارڈ")}</CardTitle>
          <Button variant="ghost" size="sm" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {log.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">{tr("No records yet", "ابھی کوئی ریکارڈ نہیں")}</p>}
          {log.map((r) => (
            <details key={r.id} className="rounded-lg border px-3 py-2 text-xs">
              <summary className="cursor-pointer">
                <b>{names[r.actor_id] || r.actor_id?.slice(0, 8)}</b> {tr("by", "نے")} {ENTITY[r.entity_type] || r.entity_type} {r.entity_id ? `#${String(r.entity_id).slice(0, 8)}` : ""} {ACTION[r.action] || r.action}
                <span className="ms-2 text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString("ur-PK-u-nu-latn", { timeZone: "Asia/Karachi" })}</span>
              </summary>
              <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap text-[10px] text-muted-foreground" dir="ltr">{JSON.stringify(r.details, null, 1)}</pre>
            </details>
          ))}
          <div className="flex justify-between items-center pt-2"><Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>{tr("Previous", "پچھلا")}</Button><span className="text-xs">{count} {tr("Actions — Page", "کارروائیاں — صفحہ")} {page}</span><Button variant="outline" size="sm" disabled={page * 30 >= count} onClick={() => setPage(p => p + 1)}>{tr("Next", "اگلا")}</Button></div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamActivityTab;
