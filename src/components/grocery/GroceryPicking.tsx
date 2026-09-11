import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Check, X, Repeat, Scale, Loader2 } from "lucide-react";

interface Props {
  orderId: string;
  storeId: string;
  editable: boolean;
  onChanged?: () => void;
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  requested: { label: "باقی / Pending", className: "bg-secondary text-foreground" },
  picking: { label: "اٹھایا جا رہا", className: "bg-blue-100 text-blue-800" },
  available: { label: "موجود / Available", className: "bg-green-100 text-green-800" },
  picked: { label: "اٹھا لیا / Picked", className: "bg-green-100 text-green-800" },
  packed: { label: "پیک / Packed", className: "bg-green-100 text-green-800" },
  substituted: { label: "متبادل / Substituted", className: "bg-amber-100 text-amber-800" },
  unavailable: { label: "ناموجود / Out of stock", className: "bg-destructive/15 text-destructive" },
  removed: { label: "نکال دیا / Removed", className: "bg-destructive/15 text-destructive" },
};

const APPROVAL_BADGE: Record<string, string> = {
  pending_customer: "⏳ گاہک کی منظوری کا انتظار",
  approved: "✅ گاہک نے منظور کیا",
  rejected: "❌ گاہک نے انکار کیا",
};

const GroceryPicking = ({ orderId, storeId, editable, onChanged }: Props) => {
  const [items, setItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [weights, setWeights] = useState<Record<string, string>>({});
  const [subOpen, setSubOpen] = useState<string | null>(null);

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
      .channel(`goi-${orderId}`)
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

  useEffect(() => {
    if (!editable) return;
    (supabase as any)
      .from("grocery_products")
      .select("id,name,price,discount_price,wholesale_price")
      .eq("store_id", storeId)
      .eq("is_available", true)
      .order("name")
      .limit(200)
      .then(({ data }: any) => setProducts(data || []));
  }, [storeId, editable]);

  const run = async (id: string, fn: () => Promise<any>) => {
    setBusy(id);
    const { data, error } = await fn();
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data?.approval_required) toast("⏳ گاہک کی منظوری درکار ہے", { duration: 5000 });
    else toast.success("اپڈیٹ ہو گیا / Updated");
    load();
    onChanged?.();
  };

  const pick = (item: any, action: string, weight?: number) =>
    run(item.id, () =>
      (supabase.rpc as any)("grocery_pick_item", {
        _item_id: item.id,
        _action: action,
        _picked_qty: action === "unavailable" ? 0 : null,
        _picked_weight: weight ?? null,
        _reason: null,
      })
    );

  const substitute = (item: any, productId: string) =>
    run(item.id, () =>
      (supabase.rpc as any)("grocery_substitute_item", {
        _item_id: item.id,
        _substitute_product_id: productId,
        _substitute_qty: null,
        _reason: "دکان پر اصل آئٹم ناموجود",
      })
    );

  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-extrabold text-foreground">🧺 پکنگ / Picking</p>
      {items.map((it) => {
        const badge = STATUS_BADGE[it.status] || STATUS_BADGE.requested;
        const changed = Number(it.adjustment_amount) !== 0;
        return (
          <div key={it.id} className="rounded-xl border p-2.5 space-y-1.5 text-xs">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold truncate">
                  {it.name}
                  {it.variant_label ? ` · ${it.variant_label}` : ""} × {Number(it.requested_qty)}
                  {it.is_weight_based ? " kg" : ""}
                </p>
                {it.substitute_name && (
                  <p className="text-amber-700">↪ متبادل: {it.substitute_name} · Rs {Number(it.substitute_unit_price)}</p>
                )}
                {it.picked_weight_kg && (
                  <p className="text-muted-foreground">⚖️ اصل وزن: {Number(it.picked_weight_kg)} kg</p>
                )}
                {it.approval_status !== "none" && (
                  <p className="text-muted-foreground">{APPROVAL_BADGE[it.approval_status]}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <Badge className={`text-[10px] ${badge.className}`}>{badge.label}</Badge>
                <p className={`mt-1 font-bold ${changed ? "text-amber-700" : ""}`}>
                  Rs {Number(it.final_line_total)}
                </p>
                {changed && (
                  <p className="text-[10px] text-muted-foreground line-through">Rs {Number(it.original_line_total)}</p>
                )}
              </div>
            </div>

            {editable && (
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px] gap-1"
                  disabled={busy === it.id}
                  onClick={() => pick(it, "picked")}
                >
                  {busy === it.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} موجود
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px] gap-1 text-destructive"
                  disabled={busy === it.id}
                  onClick={() => pick(it, "unavailable")}
                >
                  <X className="h-3 w-3" /> ناموجود
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px] gap-1"
                  onClick={() => setSubOpen(subOpen === it.id ? null : it.id)}
                >
                  <Repeat className="h-3 w-3" /> متبادل
                </Button>
                {it.is_weight_based && (
                  <span className="flex items-center gap-1">
                    <Scale className="h-3 w-3 text-muted-foreground" />
                    <Input
                      className="h-7 w-20 text-[11px]"
                      type="number"
                      step="0.01"
                      placeholder="kg"
                      value={weights[it.id] ?? ""}
                      onChange={(e) => setWeights((w) => ({ ...w, [it.id]: e.target.value }))}
                    />
                    <Button
                      size="sm"
                      className="h-7 text-[11px]"
                      disabled={!weights[it.id] || busy === it.id}
                      onClick={() => pick(it, "picked", Number(weights[it.id]))}
                    >
                      وزن محفوظ
                    </Button>
                  </span>
                )}
              </div>
            )}

            {editable && subOpen === it.id && (
              <Select
                onValueChange={(v) => {
                  setSubOpen(null);
                  substitute(it, v);
                }}
              >
                <SelectTrigger className="h-8 text-[11px]">
                  <SelectValue placeholder="متبادل پروڈکٹ منتخب کریں" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.name} · Rs {p.wholesale_price ?? p.discount_price ?? p.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default GroceryPicking;
