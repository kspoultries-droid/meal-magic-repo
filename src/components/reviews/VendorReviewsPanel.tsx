import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Star, MessageSquare, RefreshCw } from "lucide-react";

export type ReviewKind = "food" | "grocery" | "service";

interface ReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  reply: string | null;
  created_at: string;
  items: { name: string; quantity: number }[];
}

const Stars = ({ n }: { n: number }) => (
  <span className="inline-flex">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star key={s} className={`w-3.5 h-3.5 ${s <= n ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40"}`} />
    ))}
  </span>
);

const VendorReviewsPanel = ({ kind }: { kind: ReviewKind }) => {
  const { user } = useAuth();
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    let out: ReviewRow[] = [];

    if (kind === "food") {
      const { data: rests } = await supabase.from("restaurants").select("id").eq("owner_id", user.id);
      const ids = (rests || []).map((r: any) => r.id);
      if (ids.length) {
        const { data } = await supabase
          .from("order_reviews").select("*").in("restaurant_id", ids)
          .order("created_at", { ascending: false }).limit(50);
        const orderIds = (data || []).map((r: any) => r.order_id);
        const { data: items } = orderIds.length
          ? await supabase.from("order_items").select("order_id, name, quantity").in("order_id", orderIds)
          : { data: [] as any[] };
        out = (data || []).map((r: any) => ({
          id: r.id, rating: r.rating, comment: r.comment, reply: r.reply, created_at: r.created_at,
          items: (items || []).filter((i: any) => i.order_id === r.order_id).map((i: any) => ({ name: i.name, quantity: i.quantity })),
        }));
      }
    } else if (kind === "grocery") {
      const { data: stores } = await supabase.from("grocery_stores").select("id").eq("owner_id", user.id);
      const ids = (stores || []).map((s: any) => s.id);
      if (ids.length) {
        const { data } = await supabase
          .from("grocery_reviews").select("*").in("store_id", ids)
          .order("created_at", { ascending: false }).limit(50);
        const orderIds = (data || []).map((r: any) => r.order_id);
        const { data: orders } = orderIds.length
          ? await supabase.from("grocery_cart_orders").select("id, items").in("id", orderIds)
          : { data: [] as any[] };
        out = (data || []).map((r: any) => {
          const raw = (orders || []).find((o: any) => o.id === r.order_id)?.items;
          const list = Array.isArray(raw) ? raw : [];
          return {
            id: r.id, rating: r.rating, comment: r.comment, reply: r.reply, created_at: r.created_at,
            items: list.map((i: any) => ({ name: i.name, quantity: Number(i.quantity || 1) })),
          };
        });
      }
    } else {
      const { data: provider } = await supabase.from("service_providers").select("id").eq("user_id", user.id).maybeSingle();
      if (provider) {
        const { data } = await supabase
          .from("service_reviews").select("*, services(name)").eq("provider_id", provider.id)
          .order("created_at", { ascending: false }).limit(50);
        out = (data || []).map((r: any) => ({
          id: r.id, rating: r.rating, comment: r.comment, reply: r.reply, created_at: r.created_at,
          items: r.services?.name ? [{ name: r.services.name, quantity: 1 }] : [],
        }));
      }
    }

    setRows(out);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id, kind]);

  const sendReply = async (id: string) => {
    const text = (drafts[id] || "").trim();
    if (!text) { toast.error("جواب لکھیں"); return; }
    setBusy(id);
    const { error } = await supabase.rpc("reply_to_review", { _kind: kind, _review_id: id, _reply: text });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("جواب محفوظ ہو گیا ✅");
    setDrafts((d) => ({ ...d, [id]: "" }));
    load();
  };

  const avg = rows.length ? (rows.reduce((s, r) => s + r.rating, 0) / rows.length).toFixed(1) : "—";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="w-4 h-4" /> کسٹمر ریویوز
          {rows.length > 0 && <Badge variant="outline" className="text-[10px]">⭐ {avg} • {rows.length}</Badge>}
        </CardTitle>
        <Button size="sm" variant="outline" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">لوڈ ہو رہا ہے…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">ابھی کوئی ریویو نہیں آیا</p>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="rounded-xl border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Stars n={r.rating} />
                <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString("ur-PK")}</span>
              </div>
              {r.comment && <p className="text-sm">{r.comment}</p>}
              {r.items.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {r.items.map((i, idx) => (
                    <Badge key={idx} variant="secondary" className="text-[10px] font-normal">{i.name} ×{i.quantity}</Badge>
                  ))}
                </div>
              )}
              {r.reply ? (
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-2">
                  <p className="text-[10px] font-bold text-primary mb-0.5">آپ کا جواب</p>
                  <p className="text-xs">{r.reply}</p>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={drafts[r.id] || ""}
                    onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                    placeholder="جواب لکھیں…"
                    maxLength={1000}
                    className="flex-1 h-9 rounded-md border bg-background px-2 text-xs"
                  />
                  <Button size="sm" className="h-9 text-xs font-bold" disabled={busy === r.id} onClick={() => sendReply(r.id)}>
                    بھیجیں
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default VendorReviewsPanel;
