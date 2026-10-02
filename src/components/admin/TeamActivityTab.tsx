import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const ENTITY: Record<string, string> = {
  orders: "فوڈ آرڈر", grocery_cart_orders: "گروسری آرڈر", riders: "رائیڈر", restaurants: "ریسٹورنٹ",
  grocery_stores: "دکان", payouts: "ادائیگی", refunds: "ریفنڈ", rider_remittances: "کیش وصولی",
  user_roles: "کردار", partner_applications: "درخواست", approval_requests: "منظوری", staff_scopes: "شہر",
};
const ACTION: Record<string, string> = { insert: "بنایا", update: "بدلا", delete: "ہٹایا", approve: "منظور کیا", reject: "مسترد کیا", request: "درخواست دی" };

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
  const [days, setDays] = useState(7);
  const [perf, setPerf] = useState<any[]>([]);
  const [log, setLog] = useState<any[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});

  const load = async () => {
    const tasks: Promise<any>[] = [
      db.from("staff_audit_log").select("*").order("created_at", { ascending: false }).limit(150),
    ];
    if (permissions.includes("team")) tasks.push(db.rpc("team_performance", { _days: days }));
    const [l, p] = await Promise.all(tasks);
    if (l.error) toast.error(l.error.message);
    setLog(l.data || []);
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
  useEffect(() => { load(); }, [days]);

  const exportCsv = () => {
    const blob = new Blob(["\ufeff" + toCsv(perf.map((r) => ({ staff: r.full_name || r.email, total: r.total_actions, orders: r.order_actions, riders: r.rider_actions, finance: r.finance_actions, approvals: r.approvals, last: r.last_action_at })))], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `team-performance-${days}d.csv`; a.click();
  };

  return (
    <div className="space-y-4" dir="rtl">
      {permissions.includes("team") && (
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-base">ٹیم پرفارمنس</CardTitle>
            <div className="flex items-center gap-1">
              {[1, 7, 30].map((d) => (
                <button key={d} onClick={() => setDays(d)} className={`rounded-full border px-2.5 py-0.5 text-xs ${days === d ? "border-primary bg-primary text-primary-foreground" : ""}`}>{d === 1 ? "آج" : `${d} دن`}</button>
              ))}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={exportCsv}><Download className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {perf.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">اس مدت میں کوئی کام ریکارڈ نہیں</p>}
            {perf.map((r) => (
              <div key={r.actor_id} className="rounded-xl border p-3">
                <div className="flex items-center justify-between">
                  <span className="truncate text-sm font-bold">{r.full_name || r.email}</span>
                  <span className="text-lg font-extrabold text-primary">{r.total_actions}</span>
                </div>
                <div className="mt-1 grid grid-cols-4 gap-1 text-center text-[10px] text-muted-foreground">
                  <div><p className="text-sm font-bold text-foreground">{r.order_actions}</p>آرڈر</div>
                  <div><p className="text-sm font-bold text-foreground">{r.rider_actions}</p>رائیڈر</div>
                  <div><p className="text-sm font-bold text-foreground">{r.finance_actions}</p>فنانس</div>
                  <div><p className="text-sm font-bold text-foreground">{r.approvals}</p>منظوری</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">عملے کے کاموں کا ریکارڈ</CardTitle>
          <Button variant="ghost" size="sm" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {log.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">ابھی کوئی ریکارڈ نہیں</p>}
          {log.map((r) => (
            <details key={r.id} className="rounded-lg border px-3 py-2 text-xs">
              <summary className="cursor-pointer">
                <b>{names[r.actor_id] || r.actor_id?.slice(0, 8)}</b> نے {ENTITY[r.entity_type] || r.entity_type} {r.entity_id ? `#${String(r.entity_id).slice(0, 8)}` : ""} {ACTION[r.action] || r.action}
                <span className="ms-2 text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString("ur-PK")}</span>
              </summary>
              <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap text-[10px] text-muted-foreground" dir="ltr">{JSON.stringify(r.details, null, 1)}</pre>
            </details>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamActivityTab;
