import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award } from "lucide-react";

interface Stats {
  rating: number;
  totalReviews: number;
  acceptance: number;
  delivered30: number;
  cancelled30: number;
}

const grade = (score: number) => {
  if (score >= 85) return { label: "بہترین / Excellent", cls: "bg-success text-success-foreground" };
  if (score >= 70) return { label: "اچھا / Good", cls: "bg-primary text-primary-foreground" };
  if (score >= 50) return { label: "بہتری درکار", cls: "bg-warning text-warning-foreground" };
  return { label: "کمزور", cls: "bg-destructive text-destructive-foreground" };
};

const RiderScore = ({ riderId }: { riderId: string }) => {
  const [stats, setStats] = useState<Stats | null>(null);

  const load = useCallback(async () => {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceIso = since.toISOString();

    const [{ data: rider }, { data: orders }] = await Promise.all([
      supabase.from("riders").select("rating, total_reviews, acceptance_rate").eq("id", riderId).maybeSingle(),
      supabase.from("orders").select("status").eq("rider_id", riderId).gte("created_at", sinceIso),
    ]);

    const list = orders || [];
    setStats({
      rating: Number(rider?.rating || 0),
      totalReviews: Number(rider?.total_reviews || 0),
      acceptance: Number(rider?.acceptance_rate || 0),
      delivered30: list.filter((o: any) => ["delivered", "completed"].includes(o.status)).length,
      cancelled30: list.filter((o: any) => o.status === "cancelled").length,
    });
  }, [riderId]);

  useEffect(() => { load(); }, [load]);

  if (!stats) return null;

  const total = stats.delivered30 + stats.cancelled30;
  const completion = total > 0 ? (stats.delivered30 / total) * 100 : 100;
  const ratingPart = stats.totalReviews > 0 ? (stats.rating / 5) * 100 : 80;
  const acceptancePart = Math.min(100, stats.acceptance <= 1 ? stats.acceptance * 100 : stats.acceptance);
  const score = Math.round(ratingPart * 0.4 + acceptancePart * 0.3 + completion * 0.3);
  const g = grade(score);

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between gap-2 px-3 py-2">
        <CardTitle className="flex items-center gap-1.5 text-sm"><Award className="h-4 w-4" /> پرفارمنس سکور</CardTitle>
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
            <p className="text-muted-foreground">ریٹنگ</p>
            <p className="text-xs font-extrabold">⭐ {stats.rating.toFixed(1)}</p>
          </div>
          <div className="rounded-lg bg-secondary/50 py-1.5">
            <p className="text-muted-foreground">قبولیت</p>
            <p className="text-xs font-extrabold">{Math.round(acceptancePart)}%</p>
          </div>
          <div className="rounded-lg bg-secondary/50 py-1.5">
            <p className="text-muted-foreground">تکمیل</p>
            <p className="text-xs font-extrabold">{Math.round(completion)}%</p>
          </div>
          <div className="rounded-lg bg-secondary/50 py-1.5">
            <p className="text-muted-foreground">30 دن</p>
            <p className="text-xs font-extrabold">{stats.delivered30}</p>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">
          سکور = ریٹنگ 40% + آرڈر قبولیت 30% + مکمل ڈلیوری 30%
        </p>
      </CardContent>
    </Card>
  );
};

export default RiderScore;
