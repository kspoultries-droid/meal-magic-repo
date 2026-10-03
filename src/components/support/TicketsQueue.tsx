import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const SLA_MIN = 30;

export default function TicketsQueue() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [filter, setFilter] = useState<"open" | "resolved">("open");
  const [replies, setReplies] = useState<Record<string, string>>({});

  const load = async () => {
    const { data } = await (supabase as any).from("support_tickets").select("*")
      .eq("status", filter).order("created_at", { ascending: filter === "open" }).limit(100);
    setTickets(data || []);
  };
  useEffect(() => {
    load();
    const ch = supabase.channel("tickets").on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [filter]);

  const resolve = async (t: any) => {
    const reply = (replies[t.id] || "").trim();
    if (!reply) { toast.error("جواب لکھیں"); return; }
    const { error } = await (supabase as any).from("support_tickets")
      .update({ status: "resolved", staff_reply: reply, resolved_by: user?.id, resolved_at: new Date().toISOString() }).eq("id", t.id);
    if (error) { toast.error(error.message); return; }
    toast.success("حل شدہ"); load();
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button size="sm" variant={filter === "open" ? "default" : "outline"} onClick={() => setFilter("open")}>کھلی شکایات</Button>
        <Button size="sm" variant={filter === "resolved" ? "default" : "outline"} onClick={() => setFilter("resolved")}>حل شدہ</Button>
      </div>
      {tickets.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">کوئی شکایت نہیں</p>}
      {tickets.map((t) => {
        const age = Math.round((Date.now() - new Date(t.created_at).getTime()) / 60000);
        const late = filter === "open" && age > SLA_MIN;
        return (
          <div key={t.id} className={`rounded-lg border p-3 text-xs space-y-1.5 ${late ? "border-destructive" : ""}`}>
            <div className="flex justify-between gap-2">
              <Badge variant="outline">{t.category}</Badge>
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
    </div>
  );
}
