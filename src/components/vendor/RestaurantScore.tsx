import { tr } from "@/lib/i18n/tr";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award } from "lucide-react";

interface Stats {
  rating: number;
  reviews: number;
  delivered: number;
  cancelled: number;
  avgAcceptMinutes: number | null;
}

const grade = (score: number) => {
  if (score >= 85) return { label: tr("Excellent", "بہترین / Excellent"), cls: "bg-success text-success-foreground" };
  if (score >= 70) return { label: tr("Good", "اچھا / Good"), cls: "bg-primary text-primary-foreground" };
  if (score >= 50) return { label: tr("Needs Improvement", "بہتری درکار"), cls: "bg-warning text-warning-foreground" };
  return { label: tr("Poor", "کمزور"), cls: "bg-destructive text-destructive-foreground" };
};

const RestaurantScore = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const { data: rests } = await supabase.from("restaurants").select("id, rating").eq("owner_id", user.id);
    const ids = (rests || []).map((r: any) => r.id);
    if (!ids.length) { setStats(null); return; }

    const [{ data: orders }, { data: reviews }, { data: events }] = await Promise.all([
      supabase.from("orders").select("id, status, created_at").in("restaurant_id", ids).gte("created_at", since.toISOString()),
      supabase.from("order_reviews").select("rating").in("restaurant_id", ids),
      supabase.from("order_events").select("order_id, to_value, created_at").eq("event_type", "status_change").gte("created_at", since.toISOString()),
    ]);

    const list = orders || [];
    const createdAt = new Map(list.map((o: any) => [o.id, new Date(o.created_at).getTime()]));
    const accepts = (events || [])
      .filter((e: any) => e.to_value === "confirmed" && createdAt.has(e.order_id))
      .map((e: any) => (new Date(e.created_at).getTime() - (createdAt.get(e.order_id) as number)) / 60000)
      .filter((m) => m >= 0 && m < 180);

    const rv = reviews || [];
    setStats({
      rating: rv.length ? rv.reduce((s: number, r: any) => s + Number(r.rating || 0), 0) / rv.length : Number(rests?.[0]?.rating || 0),
      reviews: rv.length,
      delivered: list.filter((o: any) => ["delivered", "completed"].includes(o.status)).length,
      cancelled: list.filter((o: any) => o.status === "cancelled").length,
      avgAcceptMinutes: accepts.length ? Math.round(accepts.reduce((s, m) => s + m, 0) / accepts.length) : null,
    });
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (!stats) return null;

  const total = stats.delivered + stats.cancelled;
  const completion = total > 0 ? (stats.delivered / total) * 100 : 100;
  const ratingPart = stats.reviews > 0 ? (stats.rating / 5) * 100 : 80;
  const speedPart = stats.avgAcceptMinutes == null ? 80 : Math.max(0, 100 - stats.avgAcceptMinutes * 5);
  const score = Math.round(ratingPart * 0.4 + completion * 0.35 + speedPart * 0.25);
  const g = grade(score);

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between gap-2 px-3 py-2">
        <CardTitle className="flex items-center gap-1.5 text-sm"><Award className="h-4 w-4" /> {tr("Store Performance Score", "دکان کا پرفارمنس سکور")}</CardTitle>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${g.cls}`}>{g.label}</span>
      </CardHeader>
      <CardContent className="space-y-2 px-3 pb-3">
        <div className="flex items-end gap-2">
          <span className="text-3xl font-black leading-none">{score}</span>
          <span className="pb-1 text-[11px] text-muted-foreground">/ 100</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${score}%` }} />
        </div>
        <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
          <div className="rounded-lg bg-secondary/50 py-1.5">
            <p className="text-muted-foreground">{tr("Rating", "ریٹنگ")}</p>
            <p className="text-xs font-extrabold">⭐ {stats.rating.toFixed(1)}</p>
          </div>
          <div className="rounded-lg bg-secondary/50 py-1.5">
            <p className="text-muted-foreground">{tr("Completed", "مکمل")}</p>
            <p className="text-xs font-extrabold">{Math.round(completion)}%</p>
          </div>
          <div className="rounded-lg bg-secondary/50 py-1.5">
            <p className="text-muted-foreground">{tr("Acceptance Time", "قبول کرنے کا وقت")}</p>
            <p className="text-xs font-extrabold">{stats.avgAcceptMinutes == null ? "—" : `${stats.avgAcceptMinutes}${tr("M", "م")}`}</p>
          </div>
          <div className="rounded-lg bg-secondary/50 py-1.5">
            <p className="text-muted-foreground">{tr("Cancelled (30 days)", "منسوخ (30 دن)")}</p>
            <p className="text-xs font-extrabold">{stats.cancelled}</p>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">{tr("Score = Rating 40% + Completed Orders 35% + Fast Acceptance 25%", "سکور = ریٹنگ 40% + مکمل آرڈرز 35% + جلد قبولیت 25%")}</p>
      </CardContent>
    </Card>
  );
};

export default RestaurantScore;
