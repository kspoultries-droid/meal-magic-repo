import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Props {
  orderId: string;
  originalAmount?: number | null;
  finalAmount?: number | null;
  onChanged?: () => void;
}

/** Customer-facing view of grocery fulfilment changes (substitutions, weights, removed items). */
const GroceryOrderAdjustments = ({ orderId, originalAmount, finalAmount, onChanged }: Props) => {
  const [items, setItems] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("grocery_order_items")
      .select("*")
      .eq("order_id", orderId)
      .order("line_index");
    setItems(data || []);
  }, [orderId]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`goi-cust-${orderId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "grocery_order_items", filter: `order_id=eq.${orderId}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [orderId, load]);

  const respond = async (itemId: string, approve: boolean) => {
    setBusy(itemId);
    const { error } = await (supabase.rpc as any)("grocery_respond_substitution", {
      _item_id: itemId,
      _approve: approve,
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(approve ? "منظور ہو گیا / Approved" : "مسترد کر دیا / Rejected");
    load();
    onChanged?.();
  };

  if (items.length === 0) return null;
  const pending = items.filter((i) => i.approval_status === "pending_customer");
  const changed = items.filter((i) => Number(i.adjustment_amount) !== 0 || i.status === "unavailable");

  return (
    <div className="bg-card rounded-2xl border p-4 mt-4 space-y-3">
      <p className="text-sm font-extrabold">🧺 دکان کی تیاری / Store fulfilment</p>

      {pending.map((it) => (
        <div key={it.id} className="rounded-xl border border-amber-300 bg-amber-50 p-3 space-y-2 text-xs">
          <p className="font-bold text-amber-900">آپ کی منظوری درکار ہے</p>
          <p>
            {it.name} × {Number(it.requested_qty)}
            {it.substitute_name ? ` → ${it.substitute_name} · Rs ${Number(it.substitute_unit_price)}` : ""}
            {it.picked_weight_kg ? ` → اصل وزن ${Number(it.picked_weight_kg)} kg` : ""}
          </p>
          <div className="flex gap-2">
            <Button size="sm" className="h-8 flex-1 text-xs" disabled={busy === it.id} onClick={() => respond(it.id, true)}>
              {busy === it.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "منظور / Approve"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 flex-1 text-xs"
              disabled={busy === it.id}
              onClick={() => respond(it.id, false)}
            >
              مسترد / Reject
            </Button>
          </div>
        </div>
      ))}

      {changed.length > 0 && (
        <div className="space-y-1 text-xs">
          {changed.map((it) => (
            <div key={it.id} className="flex justify-between gap-2">
              <span className={it.status === "unavailable" || it.status === "removed" ? "line-through text-muted-foreground" : ""}>
                {it.substitute_name ? `${it.name} → ${it.substitute_name}` : it.name}
                {it.picked_weight_kg ? ` · ${Number(it.picked_weight_kg)} kg` : ""}
              </span>
              <span className="font-bold">Rs {Number(it.final_line_total)}</span>
            </div>
          ))}
        </div>
      )}

      {finalAmount != null && Number(finalAmount) !== Number(originalAmount ?? 0) && (
        <div className="border-t pt-2 text-sm flex justify-between font-extrabold">
          <span>آخری قابلِ ادائیگی</span>
          <span className="text-primary">
            Rs {Number(finalAmount)}{" "}
            <span className="text-xs font-normal text-muted-foreground line-through">Rs {Number(originalAmount)}</span>
          </span>
        </div>
      )}
    </div>
  );
};

export default GroceryOrderAdjustments;
