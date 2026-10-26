import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Receipt, MapPin, ShoppingBasket, FileImage } from "lucide-react";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "زیرِ التوا", color: "bg-yellow-100 text-yellow-800" },
  quoted: { label: "قیمت آ گئی", color: "bg-blue-100 text-blue-800" },
  confirmed: { label: "قبول شدہ", color: "bg-primary/20 text-primary" },
  preparing: { label: "تیاری", color: "bg-blue-100 text-blue-800" },
  ready: { label: "تیار ہے", color: "bg-purple-100 text-purple-800" },
  delivering: { label: "راستے میں", color: "bg-orange-100 text-orange-800" },
  out_for_delivery: { label: "راستے میں", color: "bg-orange-100 text-orange-800" },
  delivered: { label: "ڈلیور", color: "bg-green-100 text-green-800" },
  completed: { label: "مکمل", color: "bg-green-100 text-green-800" },
  cancelled: { label: "منسوخ", color: "bg-destructive/20 text-destructive" },
};

const CustomerGroceryHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    const [{ data: cart }, { data: list }] = await Promise.all([
      supabase
        .from("grocery_cart_orders")
        .select("*, grocery_stores(name)")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("grocery_list_orders")
        .select("*, grocery_stores(name)")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    const merged = [
      ...(cart || []).map((o: any) => ({ ...o, kind: "cart" })),
      ...(list || []).map((o: any) => ({ ...o, kind: "list" })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setRows(merged);
  }, [user]);

  useEffect(() => {
    fetchAll();
    if (!user) return;
    const ch = supabase
      .channel(`profile-grocery-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "grocery_cart_orders", filter: `customer_id=eq.${user.id}` }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "grocery_list_orders", filter: `customer_id=eq.${user.id}` }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, fetchAll]);

  if (rows.length === 0) return null;

  const items = Array.isArray(selected?.items) ? selected.items : [];
  const isOpen = (s: string) => !["delivered", "completed", "cancelled"].includes(s);

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-extrabold text-foreground">🛒 گروسری / بازار آرڈرز</h4>
      {rows.map((o) => {
        const st = STATUS_MAP[o.status] || STATUS_MAP.pending;
        return (
          <button
            key={`${o.kind}-${o.id}`}
            onClick={() => setSelected(o)}
            className="w-full text-left bg-card rounded-2xl p-4 border space-y-1"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8)}</p>
                <p className="font-bold text-foreground">Rs {o.total_amount ?? "—"}</p>
                <p className="text-xs text-muted-foreground">
                  {o.grocery_stores?.name} · {new Date(o.created_at).toLocaleDateString("ur-PK")}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge className={st.color}>{st.label}</Badge>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  {o.kind === "cart" ? <><ShoppingBasket className="w-3 h-3" /> آئٹم آرڈر</> : <><FileImage className="w-3 h-3" /> فوٹو لسٹ</>}
                </span>
              </div>
            </div>
            {o.bill_image_url && (
              <p className="text-[11px] text-primary font-bold flex items-center gap-1"><Receipt className="w-3 h-3" /> بل دستیاب — دیکھیں</p>
            )}
          </button>
        );
      })}

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>آرڈر تفصیل</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge className={(STATUS_MAP[selected.status] || STATUS_MAP.pending).color}>
                  {(STATUS_MAP[selected.status] || STATUS_MAP.pending).label}
                </Badge>
                <span className="text-xs text-muted-foreground">{new Date(selected.created_at).toLocaleString("ur-PK")}</span>
              </div>

              {selected.kind === "list" && selected.image_url && (
                <img src={selected.image_url} alt="راشن لسٹ" className="w-full rounded-xl border max-h-52 object-contain bg-secondary" />
              )}

              {selected.kind === "cart" && items.length > 0 && (
                <div className="bg-secondary/40 rounded-xl p-3 space-y-1">
                  {items.map((it: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{it.name} × {it.quantity}</span>
                      <span className="font-bold">Rs {Number(it.price) * Number(it.quantity)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between text-sm font-extrabold">
                <span>کل / Total</span>
                <span className="text-primary">Rs {selected.total_amount ?? "—"}</span>
              </div>

              {selected.delivery_address && (
                <p className="text-sm flex items-start gap-1"><MapPin className="w-4 h-4 mt-0.5" /> {selected.delivery_address}</p>
              )}

              {selected.bill_image_url && (
                <div className="space-y-1">
                  <p className="text-xs font-bold flex items-center gap-1"><Receipt className="w-3 h-3" /> 🧾 بل / Bill</p>
                  <img src={selected.bill_image_url} alt="بل" className="w-full rounded-xl border max-h-72 object-contain bg-secondary" />
                </div>
              )}

              {isOpen(selected.status) && (
                <Button className="w-full" onClick={() => navigate(`/order-tracking/${selected.id}`)}>ٹریک کریں 📍</Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerGroceryHistory;
