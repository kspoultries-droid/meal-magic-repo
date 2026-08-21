import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RefreshCw, AlertTriangle } from "lucide-react";

const TYPE_LABEL: Record<string, string> = {
  food: "فوڈ",
  grocery_cart: "گروسری",
  grocery_list: "لسٹ آرڈر",
};

const EVENT_LABEL: Record<string, string> = {
  status: "آرڈر اسٹیٹس",
  shipment: "شپمنٹ اسٹیٹس",
  courier: "ٹریکنگ نمبر",
};

const AuditLogTab = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [actors, setActors] = useState<Record<string, string>>({});
  const [queue, setQueue] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: ev }, { data: q }] = await Promise.all([
      (supabase as any).from("order_events").select("*").order("created_at", { ascending: false }).limit(200),
      (supabase as any)
        .from("courier_sync_queue")
        .select("*")
        .neq("state", "done")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    setEvents(ev || []);
    setQueue(q || []);
    const ids = Array.from(new Set((ev || []).map((e: any) => e.actor_id).filter(Boolean)));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids as string[]);
      const map: Record<string, string> = {};
      (profs || []).forEach((p: any) => { map[p.id] = p.full_name || p.id.slice(0, 8); });
      setActors(map);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const filtered = events.filter((e) =>
    !search.trim() ||
    e.order_id.includes(search.trim()) ||
    (e.tracking_number || "").includes(search.trim())
  );

  return (
    <div className="space-y-4">
      {queue.length > 0 && (
        <Card className="border-destructive/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <AlertTriangle className="h-4 w-4" /> کورئیر اپڈیٹس جو ابھی مکمل نہیں ہوئیں
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {queue.map((q) => (
              <div key={q.id} className="rounded-lg border p-2 text-xs">
                <span className="font-mono">#{q.order_id.slice(0, 8)}</span> · {q.provider} · {q.shipment_status} ·
                کوششیں {q.attempts} · <Badge variant="outline" className="text-[10px]">{q.state}</Badge>
                {q.last_error && <p className="text-muted-foreground">{q.last_error}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>آڈٹ لاگ — آرڈر و شپمنٹ تبدیلیاں</CardTitle>
          <div className="flex items-center gap-2">
            <Input
              className="h-8 w-40 text-xs"
              placeholder="آرڈر / ٹریکنگ"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button variant="outline" size="sm" onClick={fetchAll}><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <p className="text-muted-foreground">لوڈ ہو رہا ہے...</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">کوئی ریکارڈ نہیں</p>
          ) : (
            filtered.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{TYPE_LABEL[e.order_type] || e.order_type}</Badge>
                  <span className="font-mono text-muted-foreground">#{e.order_id.slice(0, 8)}</span>
                  <span className="font-bold">{EVENT_LABEL[e.event_type] || e.event_type}:</span>
                  <span>{e.from_value || "—"} → <span className="font-bold">{e.to_value || "—"}</span></span>
                  {e.tracking_number && <span className="text-muted-foreground">· {e.courier_name} {e.tracking_number}</span>}
                </div>
                <div className="text-muted-foreground">
                  {e.actor_id ? (actors[e.actor_id] || e.actor_id.slice(0, 8)) : `سسٹم (${e.source})`} ·{" "}
                  {new Date(e.created_at).toLocaleString("ur-PK", { dateStyle: "short", timeStyle: "short" })}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogTab;
