import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { tr } from "@/lib/i18n/tr";
import { ReceiptText } from "lucide-react";

const STATUS: Record<string, [string, string]> = {
  pending: ["New", "نیا"], accepted: ["Accepted", "قبول"], picking: ["Packing", "تیاری"], packed: ["Packed", "پیک"],
  ready: ["Ready", "تیار"], out_for_delivery: ["On the way", "راستے میں"], delivered: ["Delivered", "پہنچ گیا"],
  completed: ["Completed", "مکمل"], cancelled: ["Cancelled", "منسوخ"], returned_to_store: ["Returned", "واپس"],
};
const DAYS = [7, 30, 90];

const ShopSalesRecord = ({ storeId }: { storeId: string }) => {
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const { data } = await supabase.from("grocery_cart_orders")
        .select("id,created_at,status,items,total_amount,final_amount,delivery_fee,payment_method")
        .eq("store_id", storeId).gte("created_at", since).order("created_at", { ascending: false }).limit(200);
      setRows(data || []);
      setLoading(false);
    })();
  }, [storeId, days]);

  const sold = useMemo(() => rows.filter((r) => ["delivered", "completed"].includes(r.status)), [rows]);
  const amount = (r: any) => Number(r.final_amount ?? r.total_amount ?? 0);
  const total = sold.reduce((s, r) => s + amount(r), 0);

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><ReceiptText className="h-4 w-4" /> {tr("Sales record", "فروخت کا مکمل ریکارڈ")}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          {DAYS.map((d) => (
            <button key={d} onClick={() => setDays(d)} className={`px-3 py-1.5 rounded-full text-xs font-bold border ${days === d ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>
              {d} {tr("days", "دن")}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 text-center text-xs">
          <div className="bg-secondary/50 rounded-xl py-2"><p className="text-muted-foreground">{tr("Delivered orders", "پہنچے آرڈرز")}</p><p className="text-sm font-extrabold">{sold.length}</p></div>
          <div className="bg-secondary/50 rounded-xl py-2"><p className="text-muted-foreground">{tr("Sale amount", "فروخت کی رقم")}</p><p className="text-sm font-extrabold">Rs {total.toLocaleString()}</p></div>
        </div>
        {loading ? <p className="text-sm text-muted-foreground">{tr("Loading…", "لوڈ ہو رہا ہے…")}</p>
          : rows.length === 0 ? <p className="text-sm text-muted-foreground">{tr("No orders in this period", "اس عرصے میں کوئی آرڈر نہیں")}</p>
          : (
          <div className="space-y-2">
            {rows.map((r) => {
              const items = Array.isArray(r.items) ? r.items : [];
              const st = STATUS[r.status] || [r.status, r.status];
              const bad = ["cancelled", "returned_to_store"].includes(r.status);
              return (
                <div key={r.id} className="rounded-xl border border-border p-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold" dir="ltr">#{r.id.slice(0, 8)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${bad ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>{tr(st[0], st[1])}</span>
                  </div>
                  <p className="text-muted-foreground mt-0.5" dir="ltr">{new Date(r.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</p>
                  <ul className="mt-1.5 space-y-0.5">
                    {items.map((it: any, i: number) => (
                      <li key={i} className="flex justify-between gap-2">
                        <span className="truncate">{it.name} × {it.quantity ?? it.qty ?? 1}</span>
                        <span dir="ltr">Rs {(Number(it.price || 0) * Number(it.quantity ?? it.qty ?? 1)).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-1.5 flex justify-between border-t border-border pt-1.5 font-bold">
                    <span>{tr("Order total", "آرڈر کی رقم")} · {r.payment_method === "cod" ? tr("Cash", "نقد") : r.payment_method}</span>
                    <span dir="ltr" className={bad ? "line-through text-muted-foreground" : ""}>Rs {amount(r).toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
export default ShopSalesRecord;
