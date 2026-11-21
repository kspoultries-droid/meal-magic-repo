import OperationsDateFilter from "./OperationsDateFilter";
import { AdminPagination } from "./AdminListTools";
import { applyOperationFilters, operationDates, operationRange } from "@/lib/operationsList";
import { tr } from "@/lib/i18n/tr";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RefreshCw, AlertTriangle } from "lucide-react";

const TYPE_LABEL: Record<string, string> = {
  food: tr("Food", "فوڈ"),
  grocery_cart: tr("Grocery", "گروسری"),
  grocery_list: tr("Order List", "لسٹ آرڈر"),
};

const EVENT_LABEL: Record<string, string> = {
  status: tr("Order Status", "آرڈر اسٹیٹس"),
  shipment: tr("Shipment Status", "شپمنٹ اسٹیٹس"),
  courier: tr("Tracking Number", "ٹریکنگ نمبر"),
};

const AuditLogTab = () => {
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [kind, setKind] = useState("all");
  const [count, setCount] = useState(0);
  const [listError, setListError] = useState("");
  const request = useRef(0);
  const [events, setEvents] = useState<any[]>([]);
  const [actors, setActors] = useState<Record<string, string>>({});
  const [queue, setQueue] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async (showLoading = true) => {
    const seq = ++request.current;
    if (operationDates(from, to).invalid) { setLoading(false); return; }
    if (showLoading) setLoading(true);
    try {
      let builder = (supabase as any).from("order_events").select("*", { count: "exact" });
      if (kind !== "all") builder = builder.eq("order_type", kind);
      const [start, end] = operationRange(page);
      const [eventsResult, queueResult] = await Promise.all([
        applyOperationFilters(builder, from, to, search, ["tracking_number"], [], "order_id").order("created_at", { ascending: false }).order("id", { ascending: false }).range(start, end),
        (supabase as any).from("courier_sync_queue").select("*").neq("state", "done").order("created_at", { ascending: false }).limit(50),
      ]);
      if (eventsResult.error) throw eventsResult.error;
      if (queueResult.error) throw queueResult.error;
      const ids = Array.from(new Set<string>((eventsResult.data || []).map((e: any) => e.actor_id).filter(Boolean)));
      const profiles = ids.length ? await supabase.from("profiles").select("id, full_name").in("id", ids) : { data: [], error: null };
      if (profiles.error) throw profiles.error;
      if (seq !== request.current) return;
      const map: Record<string, string> = {};
      (profiles.data || []).forEach(p => { map[p.id] = p.full_name || p.id.slice(0, 8); });
      setEvents(eventsResult.data || []); setQueue(queueResult.data || []); setActors(map); setCount(eventsResult.count || 0); setListError("");
      const last = Math.max(1, Math.ceil((eventsResult.count || 0) / 20));
      if (page > last) setPage(last);
    } catch (error) { if (seq === request.current) setListError((error as Error).message); }
    finally { if (seq === request.current) setLoading(false); }
  }, [search, page, from, to, kind]);
  useEffect(() => { const timer = setTimeout(() => void fetchAll(), 300); return () => { clearTimeout(timer); request.current++; }; }, [fetchAll]);

  return (
    <div className="space-y-4">
      {queue.length > 0 && (
        <Card className="border-destructive/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <AlertTriangle className="h-4 w-4" /> {tr("Pending Courier Updates", "کورئیر اپڈیٹس جو ابھی مکمل نہیں ہوئیں")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {queue.map((q) => (
              <div key={q.id} className="rounded-lg border p-2 text-xs">
                <span className="font-mono">#{q.order_id.slice(0, 8)}</span> · {q.provider} · {q.shipment_status} {tr("·\n                Attempts", "·\n                کوششیں")} {q.attempts} · <Badge variant="outline" className="text-[10px]">{q.state}</Badge>
                {q.last_error && <p className="text-muted-foreground">{q.last_error}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>{tr("Audit Log — Order & Shipment Changes", "آڈٹ لاگ — آرڈر و شپمنٹ تبدیلیاں")}</CardTitle>
          <div className="flex items-center gap-2">
            <Input
              className="h-8 w-40 text-xs"
              placeholder={tr("Order / Tracking", "آرڈر / ٹریکنگ")}
              value={search}
              aria-label={tr("Order / Tracking", "آرڈر / ٹریکنگ")} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
            <Button variant="outline" size="sm" aria-label={tr("Refresh audit log", "آڈٹ لاگ تازہ کریں")} onClick={() => void fetchAll(false)}><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <OperationsDateFilter from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); setPage(1); }} />
          <div className="flex flex-wrap gap-2">{[["all", tr("All", "سب")], ...Object.entries(TYPE_LABEL)].map(([value, label]) => <Button key={value} size="sm" variant={kind === value ? "default" : "outline"} onClick={() => { setKind(value); setPage(1); }}>{label}</Button>)}</div>
          <p className="text-xs text-muted-foreground">{count} {tr("Results", "نتائج")}</p>
          {listError && <p role="alert" className="text-sm text-destructive">{listError}</p>}
          {loading ? (
            <p className="text-muted-foreground">{tr("Loading...", "لوڈ ہو رہا ہے...")}</p>
          ) : events.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">{tr("No records found", "کوئی ریکارڈ نہیں")}</p>
          ) : (
            events.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{TYPE_LABEL[e.order_type] || e.order_type}</Badge>
                  <span className="font-mono text-muted-foreground">#{e.order_id.slice(0, 8)}</span>
                  <span className="font-bold">{EVENT_LABEL[e.event_type] || e.event_type}:</span>
                  <span>{e.from_value || "—"} → <span className="font-bold">{e.to_value || "—"}</span></span>
                  {e.tracking_number && <span className="text-muted-foreground">· {e.courier_name} {e.tracking_number}</span>}
                </div>
                <div className="text-muted-foreground">
                  {e.actor_id ? (actors[e.actor_id] || e.actor_id.slice(0, 8)) : `${tr("System (", "سسٹم (")}${e.source})`} ·{" "}
                  {new Date(e.created_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Karachi" })}
                </div>
              </div>
            ))
          )}
          <AdminPagination page={page} count={count} onPage={setPage} />
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogTab;
