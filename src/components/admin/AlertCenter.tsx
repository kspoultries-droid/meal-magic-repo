import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BellRing, CheckCheck, RefreshCw } from "lucide-react";
import { isStaffOrderOverdue, elapsedMinutes } from "@/lib/staffTiming";

const STORE_KEY = "admin-alerts-read";

interface Alert {
  id: string;
  kind: "order" | "application" | "remittance";
  title: string;
  detail: string;
  at: string;
  severity: "high" | "normal";
}

const readSet = (): Set<string> => {
  try { return new Set(JSON.parse(localStorage.getItem(STORE_KEY) || "[]")); } catch { return new Set(); }
};
const persist = (s: Set<string>) => localStorage.setItem(STORE_KEY, JSON.stringify([...s].slice(-500)));

const target = (kind: Alert["kind"]): [string, string] => {
  if (kind === "application") return ["partners", "applications"];
  if (kind === "remittance") return ["finance", "rider-remit"];
  return ["operations", "orders"];
};

const AlertCenter = ({ onNavigate }: { onNavigate?: (section: string, sub?: string) => void }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [read, setRead] = useState<Set<string>>(readSet);
  const [onlyUnread, setOnlyUnread] = useState(true);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    const oldest = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const start = (page - 1) * 40;

    const [{ data: orders }, { data: apps }, { data: remits }] = await Promise.all([
      supabase.from("orders").select("id, status, rider_id, total_amount, created_at").lt("created_at", oldest).or("status.eq.pending,and(status.in.(confirmed,preparing),rider_id.is.null)").order("created_at").order("id").range(start,start + 39),
      supabase.from("partner_applications").select("id, business_name, applicant_type, created_at").eq("status", "pending").order("created_at").order("id").range(start,start + 39),
      supabase.from("rider_remittances").select("id, amount, created_at, status").eq("status", "pending").order("created_at").order("id").range(start,start + 39),
    ]);

    const out: Alert[] = [];

    (orders || []).forEach((o: any) => {
      if (o.status === "pending" && isStaffOrderOverdue(o.created_at)) {
        out.push({ id: `stuck-${o.id}`, kind: "order", severity: "high", at: o.created_at,
          title: "آرڈر ابھی تک قبول نہیں ہوا", detail: `#${o.id.slice(0, 8)} — Rs ${o.total_amount}` });
      }
      if (["confirmed", "preparing"].includes(o.status) && !o.rider_id && isStaffOrderOverdue(o.created_at)) {
        out.push({ id: `norider-${o.id}`, kind: "order", severity: "high", at: o.created_at,
          title: "رائیڈر تفویض نہیں ہوا", detail: `#${o.id.slice(0, 8)} — Rs ${o.total_amount}` });
      }
    });

    (apps || []).forEach((a: any) => out.push({
      id: `app-${a.id}`, kind: "application", severity: "normal", at: a.created_at,
      title: "نئی پارٹنر درخواست", detail: `${a.business_name} — ${a.applicant_type}`,
    }));

    (remits || []).forEach((r: any) => out.push({
      id: `remit-${r.id}`, kind: "remittance", severity: "normal", at: r.created_at,
      title: "رائیڈر کیش جمع — تصدیق درکار", detail: `Rs ${Math.round(Number(r.amount || 0))}`,
    }));

    out.sort((a, b) => +new Date(a.at) - +new Date(b.at));
    setAlerts(out);
    setLoading(false);
  }, [page]);

  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, [load]);

  const unreadCount = useMemo(() => alerts.filter((a) => !read.has(a.id)).length, [alerts, read]);
  const visible = onlyUnread ? alerts.filter((a) => !read.has(a.id)) : alerts;

  const markRead = (id: string) => {
    const next = new Set(read); next.add(id); setRead(next); persist(next);
  };
  const markAll = () => {
    const next = new Set(read); alerts.forEach((a) => next.add(a.id)); setRead(next); persist(next);
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 px-3 py-2">
        <CardTitle className="flex items-center gap-1.5 text-sm">
          <BellRing className="h-4 w-4" /> الرٹ سینٹر
          {unreadCount > 0 && <Badge className="h-5 min-w-5 justify-center px-1 text-[10px]">{unreadCount} اس صفحے پر</Badge>}
        </CardTitle>
        <div className="flex flex-wrap gap-1">
          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setOnlyUnread((v) => !v)}>
            {onlyUnread ? "سب دکھائیں" : "صرف نئے"}
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={markAll} disabled={unreadCount === 0}>
            <CheckCheck className="me-1 h-3.5 w-3.5" /> سب پڑھ لیے
          </Button>
          <Button size="sm" variant="outline" className="h-7 px-2" onClick={load}><RefreshCw className="h-3.5 w-3.5" /></Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5 px-3 pb-3">
        {loading ? (
          <p className="text-xs text-muted-foreground">لوڈ ہو رہا ہے…</p>
        ) : visible.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">کوئی نیا الرٹ نہیں ✅</p>
        ) : (
          visible.map((a) => {
            const isRead = read.has(a.id);
            return (
              <div key={a.id} className={`flex items-start justify-between gap-2 rounded-lg border px-2.5 py-1.5 ${isRead ? "opacity-60" : a.severity === "high" ? "border-destructive/40 bg-destructive/5" : "bg-secondary/30"}`}>
                <Button variant="ghost"
                  type="button"
                  className="min-w-0 flex-1 h-auto flex-col items-start text-start whitespace-normal"
                  onClick={() => { markRead(a.id); const [s, sub] = target(a.kind); onNavigate?.(s, sub); }}
                >
                  <p className="truncate text-xs font-bold">{a.title}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{a.detail}</p>
                  <p className="text-[10px] text-muted-foreground">{elapsedMinutes(a.at)} منٹ پہلے</p>
                </Button>
                {!isRead && (
                  <Button size="sm" variant="ghost" className="h-6 shrink-0 px-2 text-[10px]" onClick={() => markRead(a.id)}>پڑھ لیا</Button>
                )}
              </div>
            );
          })
        )}
      </CardContent>
      <div className="flex items-center justify-between px-3 pb-3"><Button variant="outline" size="sm" disabled={page === 1 || loading} onClick={() => setPage(p => p - 1)}>پچھلا</Button><span className="text-xs">صفحہ {page}</span><Button variant="outline" size="sm" disabled={alerts.length < 40 || loading} onClick={() => setPage(p => p + 1)}>اگلا</Button></div>
    </Card>
  );
};

export default AlertCenter;
