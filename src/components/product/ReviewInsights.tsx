import { useEffect, useState } from "react";
import { Loader2, Sparkles, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/** Star breakdown + optional AI summary of real buyer reviews (button-press only to save cost). */
const ReviewInsights = ({ productId, rating, count, L, lang }: { productId: string; rating: number; count: number; L: (en: string, ur: string) => string; lang: string }) => {
  const [bars, setBars] = useState<Record<string, number>>({});
  const [sum, setSum] = useState<{ ur: string; en: string; pros: string[]; cons: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { supabase.rpc("product_rating_breakdown" as any, { _product_id: productId }).then(({ data }) => setBars((data as any) || {})); }, [productId]);
  const summarise = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("shopping-assistant", { body: { mode: "summary", product_id: productId } });
    setBusy(false);
    if (error || data?.error) { let m = data?.error; try { m = m || (await (error as any)?.context?.json())?.error; } catch { /* ignore */ } toast.error(m || L("Could not summarise", "خلاصہ نہیں بن سکا")); return; }
    if (!data?.summary) { toast.info(L("Need at least 2 written reviews for a summary", "خلاصے کے لیے کم از کم 2 تحریری ریویوز چاہئیں")); return; }
    setSum(data.summary);
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-4" data-testid="review-insights">
      <div className="flex items-center gap-4">
        <div className="text-center"><p className="text-3xl font-extrabold text-foreground">{count ? rating.toFixed(1) : "—"}</p><div className="flex text-primary">{[1, 2, 3, 4, 5].map((s) => <Star key={s} className={`size-3 ${s <= Math.round(rating) ? "fill-primary" : "text-muted"}`} />)}</div><p className="mt-0.5 text-[10px] text-muted-foreground">{count} {L("ratings", "ریٹنگز")}</p></div>
        <div className="flex-1 space-y-1">{["5", "4", "3", "2", "1"].map((k) => { const n = Number(bars[k] || 0); return <div key={k} className="flex items-center gap-2 text-[10px] text-muted-foreground"><span className="w-3">{k}</span><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${count ? (n / count) * 100 : 0}%` }} /></div><span className="w-5 text-end">{n}</span></div>; })}</div>
      </div>
      {count >= 2 && !sum && <Button variant="outline" size="sm" className="mt-3 w-full" onClick={summarise} disabled={busy}>{busy ? <Loader2 className="me-1 h-4 w-4 animate-spin" /> : <Sparkles className="me-1 h-4 w-4" />}{L("What buyers say (AI summary)", "خریدار کیا کہتے ہیں (AI خلاصہ)")}</Button>}
      {sum && <div className="mt-3 rounded-xl bg-accent/50 p-3 text-xs leading-6" dir="auto"><p className="flex items-center gap-1 font-bold text-primary"><Sparkles className="h-3.5 w-3.5" />{L("From real buyer reviews", "حقیقی خریداروں کے ریویوز سے")}</p><p className="text-foreground">{lang === "ur" ? sum.ur : sum.en}</p>{sum.pros.length > 0 && <p className="text-muted-foreground">👍 {sum.pros.join(" · ")}</p>}{sum.cons.length > 0 && <p className="text-muted-foreground">👎 {sum.cons.join(" · ")}</p>}</div>}
    </div>
  );
};
export default ReviewInsights;
