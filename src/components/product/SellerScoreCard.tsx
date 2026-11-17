import { useEffect, useState } from "react";
import { BadgeCheck, ChevronRight, PackageCheck, Store, ThumbsUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export type ShopScore = { rating: number; reviews: number; positive_pct: number | null; delivered: number; completion_pct: number | null; trusted: boolean };

/** Daraz-style seller box: every number is computed on the server from real reviews and orders. */
const SellerScoreCard = ({ storeId, name, L, onOpen }: { storeId: string; name: string; L: (en: string, ur: string) => string; onOpen: () => void }) => {
  const [s, setS] = useState<ShopScore | null>(null);
  useEffect(() => { supabase.rpc("shop_quality_score" as any, { _store_id: storeId }).then(({ data }) => setS((data as any) || null)); }, [storeId]);
  const tile = (icon: JSX.Element, value: string, label: string) => (
    <div className="rounded-xl bg-secondary/40 p-2 text-center"><div className="mx-auto flex w-fit items-center gap-1 text-primary">{icon}<span className="text-sm font-extrabold text-foreground">{value}</span></div><p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{label}</p></div>
  );
  return (
    <div className="rounded-2xl border border-border bg-card p-4" data-testid="seller-score">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary"><Store className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-extrabold text-foreground" dir="auto">{name}</p>
          {s?.trusted ? <p className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-primary"><BadgeCheck className="h-3.5 w-3.5" />{L("Trusted seller", "قابلِ اعتماد دکان")}</p>
            : <p className="text-[11px] text-muted-foreground">{L("Building its record", "ریکارڈ بن رہا ہے")}</p>}
        </div>
        <Button variant="outline" size="sm" onClick={onOpen}>{L("Shop", "دکان")} <ChevronRight className="ms-1 h-3 w-3 rtl:rotate-180" /></Button>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {tile(<ThumbsUp className="h-3.5 w-3.5" />, s?.positive_pct != null ? `${s.positive_pct}%` : "—", L("Positive ratings", "مثبت ریٹنگ"))}
        {tile(<PackageCheck className="h-3.5 w-3.5" />, s?.completion_pct != null ? `${s.completion_pct}%` : "—", L("Orders completed", "آرڈر مکمل"))}
        {tile(<BadgeCheck className="h-3.5 w-3.5" />, String(s?.delivered ?? 0), L("Delivered orders", "ڈیلیور شدہ آرڈر"))}
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">{s && s.reviews > 0 ? L(`Shop rating ${s.rating} ★ from ${s.reviews} verified buyers`, `${s.reviews} تصدیق شدہ خریداروں سے دکان کی ریٹنگ ${s.rating} ★`) : L("No shop reviews yet; figures come only from real orders.", "ابھی دکان کا کوئی ریویو نہیں؛ اعداد صرف حقیقی آرڈرز سے آتے ہیں۔")}</p>
    </div>
  );
};
export default SellerScoreCard;
