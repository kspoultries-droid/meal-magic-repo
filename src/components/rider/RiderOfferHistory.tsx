import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, RefreshCw } from "lucide-react";

interface OfferRow {
  id: string;
  order_id: string;
  order_kind: string;
  status: string;
  created_at: string;
  expires_at: string | null;
  responded_at?: string | null;
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  accepted: { label: "قبول کیا", cls: "bg-success text-success-foreground" },
  declined: { label: "انکار کیا", cls: "bg-destructive text-destructive-foreground" },
  expired: { label: "جواب نہیں دیا", cls: "bg-warning text-warning-foreground" },
  cancelled: { label: "منسوخ", cls: "bg-muted text-muted-foreground" },
  pending: { label: "زیرِ التوا", cls: "bg-primary text-primary-foreground" },
};

const KIND_LABEL: Record<string, string> = {
  food: "فوڈ",
  grocery_cart: "گروسری",
  grocery_list: "لسٹ آرڈر",
};

const RiderOfferHistory = ({ riderId }: { riderId: string }) => {
  const [rows, setRows] = useState<OfferRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("delivery_offers")
      .select("id,order_id,order_kind,status,created_at,expires_at,responded_at")
      .eq("rider_id", riderId)
      .order("created_at", { ascending: false })
      .limit(60);
    setRows((data as OfferRow[]) || []);
    setLoading(false);
  }, [riderId]);

  useEffect(() => { load(); }, [load]);

  const count = (s: string) => rows.filter((r) => r.status === s).length;
  const responded = count("accepted") + count("declined");
  const acceptance = responded + count("expired") > 0
    ? Math.round((count("accepted") / (responded + count("expired"))) * 100)
    : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-sm flex items-center gap-2"><History className="h-4 w-4" /> پیشکشوں کا ریکارڈ</CardTitle>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={load}><RefreshCw className="h-3.5 w-3.5" /></Button>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { label: "قبول", value: count("accepted"), cls: "text-success" },
            { label: "انکار", value: count("declined"), cls: "text-destructive" },
            { label: "بے جواب", value: count("expired"), cls: "text-warning" },
            { label: "قبولیت", value: `${acceptance}%`, cls: "text-primary" },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border bg-card px-1.5 py-2 text-center">
              <p className="text-[9px] text-muted-foreground">{s.label}</p>
              <p className={`text-sm font-extrabold ${s.cls}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <p className="py-3 text-center text-xs text-muted-foreground">لوڈ ہو رہا ہے…</p>
        ) : rows.length === 0 ? (
          <p className="py-3 text-center text-xs text-muted-foreground">ابھی کوئی پیشکش موصول نہیں ہوئی</p>
        ) : (
          <div className="space-y-1.5">
            {rows.map((r) => {
              const meta = STATUS_META[r.status] || { label: r.status, cls: "bg-secondary text-foreground" };
              return (
                <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-xs">
                  <div className="min-w-0">
                    <p className="font-bold">#{r.order_id.slice(0, 8)} · {KIND_LABEL[r.order_kind] || r.order_kind}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString("ur-PK")}</p>
                  </div>
                  <Badge className={`shrink-0 text-[10px] ${meta.cls}`}>{meta.label}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RiderOfferHistory;
