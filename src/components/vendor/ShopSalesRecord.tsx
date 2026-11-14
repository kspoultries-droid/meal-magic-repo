import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { tr } from "@/lib/i18n/tr";
import { ReceiptText } from "lucide-react";
import { groupSalesByDay, saleBucket, type SaleBucket } from "./shopLedger";

const STATUS: Record<string, [string, string]> = {
  pending: ["New", "نیا"], accepted: ["Accepted", "قبول"], picking: ["Packing", "تیاری"], packed: ["Packed", "پیک"],
  ready: ["Ready", "تیار"], out_for_delivery: ["On the way", "راستے میں"], delivered: ["Delivered", "پہنچ گیا"],
  completed: ["Completed", "مکمل"], cancelled: ["Cancelled", "منسوخ"], returned_to_store: ["Returned", "واپس"],
};
const DAYS = [7, 30, 90];
const TABS: { key: SaleBucket; label: [string, string] }[] = [
  { key: "sold", label: ["Delivered", "کامیاب"] },
  { key: "active", label: ["In progress", "جاری"] },
  { key: "cancelled", label: ["Cancelled", "منسوخ/واپس"] },
];
const rs = (n: number) => `Rs ${Math.round(n).toLocaleString("en-US")}`;

const ShopSalesRecord = ({ storeId }: { storeId: string }) => {
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState<SaleBucket>("sold");
  const [rows, setRows] = useState<any[]>([]);
  const [ledger, setLedger] = useState<Record<string, { commission: number; net: number }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const { data } = await supabase.from("grocery_cart_orders")
        .select("id,created_at,status,items,total_amount,final_amount,delivery_fee,payment_method")
        .eq("store_id", storeId).gte("created_at", since).order("created_at", { ascending: false }).limit(500);
      const list = data || [];
      setRows(list);
      const ids = list.map((r: any) => r.id);
      const map: Record<string, { commission: number; net: number }> = {};
      if (ids.length) {
        const { data: lc } = await supabase.from("platform_commissions").select("order_id,commission,net_payable").in("order_id", ids);
        (lc || []).forEach((l: any) => { map[l.order_id] = { commission: Number(l.commission || 0), net: Number(l.net_payable || 0) }; });
      }
      setLedger(map);
      setLoading(false);
    })();
  }, [storeId, days]);

  const counts = useMemo(() => {
    const c: Record<SaleBucket, number> = { sold: 0, active: 0, cancelled: 0 };
    rows.forEach((r) => c[saleBucket(r.status)]++);
    return c;
  }, [rows]);
  const visible = useMemo(() => rows.filter((r) => saleBucket(r.status) === tab), [rows, tab]);
  const daysList = useMemo(() => groupSalesByDay(visible, ledger), [visible, ledger]);
  const totals = useMemo(() => daysList.reduce((t, d) => ({ items: t.items + d.items, commission: t.commission + d.commission, net: t.net + d.net }), { items: 0, commission: 0, net: 0 }), [daysList]);

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><ReceiptText className="h-4 w-4" /> {tr("Daily shop ledger", "روزانہ کھاتہ")}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          {DAYS.map((d) => (
            <button key={d} onClick={() => setDays(d)} className={`px-3 py-1.5 rounded-full text-xs font-bold border ${days === d ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>{d} {tr("days", "دن")}</button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-secondary/50 p-1">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`rounded-lg py-1.5 text-xs font-bold ${tab === t.key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}>{tr(t.label[0], t.label[1])} ({counts[t.key]})</button>
          ))}
        </div>
        {tab === "sold" && (
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-xl bg-secondary/50 py-2"><p className="text-muted-foreground">{tr("Goods value", "سامان کی قیمت")}</p><p className="text-sm font-extrabold" dir="ltr">{rs(totals.items)}</p></div>
            <div className="rounded-xl bg-secondary/50 py-2"><p className="text-muted-foreground">{tr("Commission", "کمیشن")}</p><p className="text-sm font-extrabold text-destructive" dir="ltr">− {rs(totals.commission)}</p></div>
            <div className="rounded-xl bg-primary/10 py-2"><p className="text-muted-foreground">{tr("Your share", "آپ کا حق")}</p><p className="text-sm font-extrabold text-primary" dir="ltr">{rs(totals.net)}</p></div>
          </div>
        )}
        {tab === "active" && <p className="text-[11px] text-muted-foreground">{tr("These orders are not counted in your payment until delivered.", "یہ آرڈر ڈیلیور ہونے تک آپ کی رقم میں شامل نہیں ہوتے۔")}</p>}
        {tab === "cancelled" && <p className="text-[11px] text-muted-foreground">{tr("Cancelled/returned orders are never counted in your payment.", "منسوخ یا واپس شدہ آرڈر کبھی رقم میں شامل نہیں ہوتے۔")}</p>}

        {loading ? <p className="text-sm text-muted-foreground">{tr("Loading…", "لوڈ ہو رہا ہے…")}</p>
          : daysList.length === 0 ? <p className="text-sm text-muted-foreground">{tr("No orders here", "یہاں کوئی آرڈر نہیں")}</p>
          : daysList.map((d) => (
            <details key={d.day} className="rounded-xl border border-border" open={daysList[0].day === d.day}>
              <summary className="flex cursor-pointer items-center justify-between gap-2 p-2.5 text-xs">
                <span className="font-bold" dir="ltr">{d.label} · {d.orders.length} {tr("orders", "آرڈر")}</span>
                <span className="font-extrabold" dir="ltr">{tab === "sold" ? rs(d.net) : rs(d.items)}</span>
              </summary>
              {tab === "sold" && <p className="px-2.5 text-[11px] text-muted-foreground" dir="ltr">{rs(d.items)} − {rs(d.commission)} = {rs(d.net)}</p>}
              <div className="space-y-2 p-2.5">
                {d.orders.map((r: any) => {
                  const items = Array.isArray(r.items) ? r.items : [];
                  const st = STATUS[r.status] || [r.status, r.status];
                  const l = ledger[r.id];
                  return (
                    <div key={r.id} className="rounded-lg bg-secondary/30 p-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold" dir="ltr">#{r.id.slice(0, 8)} · {new Date(r.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tab === "cancelled" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>{tr(st[0], st[1])}</span>
                      </div>
                      <ul className="mt-1 space-y-0.5">
                        {items.map((it: any, i: number) => (
                          <li key={i} className="flex justify-between gap-2"><span className="truncate">{it.name} × {it.quantity ?? it.qty ?? 1}</span><span dir="ltr">{rs(Number(it.price || 0) * Number(it.quantity ?? it.qty ?? 1))}</span></li>
                        ))}
                      </ul>
                      <div className="mt-1 flex justify-between border-t border-border pt-1 text-[11px]">
                        <span>{r.payment_method === "cod" ? tr("Cash collected by rider", "نقد — رائیڈر نے وصول کیا") : tr("Paid online", "آن لائن ادائیگی")}</span>
                        {tab === "sold" && l ? <span className="font-bold" dir="ltr">{tr("Yours", "آپ کا")}: {rs(l.net)}</span> : <span dir="ltr" className={tab === "cancelled" ? "line-through text-muted-foreground" : ""}>{rs(Number(r.final_amount ?? r.total_amount ?? 0))}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </details>
          ))}
      </CardContent>
    </Card>
  );
};
export default ShopSalesRecord;
