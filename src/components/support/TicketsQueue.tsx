import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { elapsedMinutes, SUPPORT_SLA_MINUTES } from "@/lib/staffTiming";

const SLA_MIN = SUPPORT_SLA_MINUTES;

const CATEGORY_LABELS: Record<string, string> = { missing: "چیز کم آئی", wrong: "غلط چیز", not_as_described: "تصویر جیسی نہیں", late: "دیر", quality: "معیار", rider: "رائیڈر", payment: "ادائیگی", other: "دیگر" };

export default function TicketsQueue({ serviceOnly = false }: { serviceOnly?: boolean }) {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [filter, setFilter] = useState<"open" | "resolved">("open");
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [clock, setClock] = useState(Date.now());

  const load = async () => {
    let query = supabase.from("support_tickets").select("id,category,order_id,order_kind,description,photo_url,service_booking_id,staff_reply,created_at", { count: "exact" }).eq("status", filter);
    if (serviceOnly) query = query.eq("order_kind", "service");
    const { data, error, count: total } = await query.order("created_at", { ascending: filter === "open" }).order("id").range((page - 1) * 20,page * 20 - 1);
    if (error) toast.error(error.message);
    setTickets(data || []);
    setCount(total || 0);
  };
  useEffect(() => {
    load();
    const ch = supabase.channel("tickets").on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [filter, serviceOnly, page]);
  useEffect(() => { const t = setInterval(() => setClock(Date.now()),30000); return () => clearInterval(t); }, []);

  const resolve = async (t: any) => {
    const reply = (replies[t.id] || "").trim();
    if (!reply) { toast.error("جواب لکھیں"); return; }
    const { error } = t.service_booking_id ? await supabase.rpc("resolve_service_issue", { _ticket_id:t.id,_reply:reply }) : await (supabase as any).from("support_tickets")
      .update({ status: "resolved", staff_reply: reply, resolved_by: user?.id, resolved_at: new Date().toISOString() }).eq("id", t.id);
    if (error) { toast.error(error.message); return; }
    toast.success("حل شدہ"); load();
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button size="sm" variant={filter === "open" ? "default" : "outline"} onClick={() => { setPage(1); setFilter("open"); }}>کھلی شکایات</Button>
        <Button size="sm" variant={filter === "resolved" ? "default" : "outline"} onClick={() => { setPage(1); setFilter("resolved"); }}>حل شدہ</Button>
      </div>
      {tickets.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">کوئی شکایت نہیں</p>}
      {tickets.map((t) => {
        const age = elapsedMinutes(t.created_at, clock);
        const late = filter === "open" && age > SLA_MIN;
        return (
          <div key={t.id} className={`rounded-lg border p-3 text-xs space-y-1.5 ${late ? "border-destructive" : ""}`}>
            <div className="flex justify-between gap-2">
              <Badge variant={t.category === "not_as_described" ? "destructive" : "outline"}>{CATEGORY_LABELS[t.category] || t.category}</Badge>
              <span className={late ? "text-destructive font-bold" : "text-muted-foreground"}>{age} منٹ پہلے{late ? " — وقت سے زیادہ" : ""}</span>
            </div>
            {t.order_id && <p>آرڈر #{String(t.order_id).slice(0, 6).toUpperCase()} ({t.order_kind})</p>}
            {t.description && <p>{t.description}</p>}
            {t.photo_url && <a href={t.photo_url} target="_blank" rel="noreferrer"><img src={t.photo_url} alt="" className="h-24 rounded object-cover" /></a>}
            {filter === "open" ? (
              <div className="flex gap-2">
                <Input className="h-8 text-xs" placeholder="گاہک کو جواب" value={replies[t.id] || ""} onChange={(e) => setReplies({ ...replies, [t.id]: e.target.value })} />
                <Button size="sm" className="h-8" onClick={() => resolve(t)}>حل کریں</Button>
              </div>
            ) : <p className="text-success">جواب: {t.staff_reply}</p>}
          </div>
        );
      })}
      <div className="flex justify-between items-center"><Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>پچھلا</Button><span className="text-xs">{count} شکایات — صفحہ {page}</span><Button variant="outline" size="sm" disabled={page * 20 >= count} onClick={() => setPage(p => p + 1)}>اگلا</Button></div>
    </div>
  );
}
