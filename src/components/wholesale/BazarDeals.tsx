import { useEffect, useState } from "react";
import { Copy, Check, Ticket, Clock, Plus, X, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Voucher {
  id: string;
  code: string;
  title: string;
  title_ur: string | null;
  description: string | null;
  discount_type: "percent" | "flat";
  discount_value: number;
  max_discount: number | null;
  min_order: number;
  scope: string;
  valid_until: string | null;
}

const gradients = [
  "from-amber-500 via-orange-500 to-amber-600",
  "from-primary to-primary-glow",
  "from-destructive to-rose-500",
  "from-emerald-500 to-teal-500",
];

const BazarDeals = () => {
  const { isAdmin } = useAuth();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ code: "", title: "", discountType: "percent", discountValue: "", minOrder: "0", validUntil: "" });

  const fetchVouchers = async () => {
    const { data } = await (supabase.from("vouchers" as any).select("*").eq("is_active", true).order("sort_order") as any);
    const all: Voucher[] = data || [];
    setVouchers(all.filter((v) => v.scope === "wholesale" || v.scope === "all"));
    setLoaded(true);
  };

  useEffect(() => { fetchVouchers(); }, []);

  const createVoucher = async () => {
    if (!form.code.trim() || !form.title.trim() || !form.discountValue) {
      toast.error("کوڈ، ٹائٹل اور رعایت ضروری ہے");
      return;
    }
    const { error } = await (supabase.from("vouchers" as any).insert({
      code: form.code.trim().toUpperCase(),
      title: form.title.trim(),
      title_ur: form.title.trim(),
      discount_type: form.discountType,
      discount_value: parseFloat(form.discountValue),
      min_order: parseFloat(form.minOrder) || 0,
      scope: "wholesale",
      valid_until: form.validUntil ? new Date(form.validUntil + "T23:59:59").toISOString() : null,
    }) as any);
    if (error) { toast.error(error.message); return; }
    toast.success("بازار واؤچر بن گیا 🎟️");
    setForm({ code: "", title: "", discountType: "percent", discountValue: "", minOrder: "0", validUntil: "" });
    setDialogOpen(false);
    fetchVouchers();
  };

  const closeVoucher = async (id: string) => {
    const { error } = await (supabase.from("vouchers" as any).update({ is_active: false }).eq("id", id) as any);
    if (error) { toast.error(error.message); return; }
    toast.success("واؤچر بند کر دیا گیا");
    fetchVouchers();
  };

  const deleteVoucher = async (id: string) => {
    if (!confirm("کیا آپ واقعی یہ واؤچر حذف کرنا چاہتے ہیں؟")) return;
    const { error } = await (supabase.from("vouchers" as any).delete().eq("id", id) as any);
    if (error) { toast.error(error.message); return; }
    toast.success("واؤچر حذف ہو گیا");
    fetchVouchers();
  };

  const copyCode = async (v: Voucher) => {
    try {
      await navigator.clipboard.writeText(v.code);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = v.code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopiedId(v.id);
    toast.success(`کوڈ "${v.code}" کاپی ہو گیا — چیک آؤٹ پر لگائیں 🎟️`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!loaded) return null;
  if (vouchers.length === 0 && !isAdmin) return null;

  const daysLeft = (until: string | null) => {
    if (!until) return null;
    const d = Math.ceil((new Date(until).getTime() - Date.now()) / 86400000);
    return d > 0 ? d : null;
  };

  return (
    <section className="bg-gradient-to-b from-accent/40 to-transparent px-3 py-2.5">
      <div className="mb-1.5 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-extrabold text-foreground"><Ticket className="size-4 text-primary" /> واؤچر جمع کریں، بچت کریں</h2>
        {isAdmin && (
          <button onClick={() => setDialogOpen(true)} className="flex items-center gap-0.5 rounded-full border border-primary/40 px-2 py-0.5 text-[11px] font-bold text-primary">
            <Plus className="size-3" /> نیا واؤچر
          </button>
        )}
      </div>
      {vouchers.length === 0 ? (
        <p className="rounded-xl bg-card py-3 text-center text-xs text-muted-foreground">ابھی کوئی واؤچر نہیں</p>
      ) : (
        <div className="flex overflow-x-auto scrollbar-hide rounded-xl bg-card shadow-card">
          {vouchers.map((v) => {
            const left = daysLeft(v.valid_until);
            return (
              <div key={v.id} className="relative shrink-0 border-e border-dashed border-border last:border-e-0">
                <button onClick={() => copyCode(v)} className="flex w-36 flex-col items-start px-3 py-2 text-start active:bg-muted">
                  <span className="text-base font-extrabold leading-tight text-primary">
                    {v.discount_type === "percent" ? `${v.discount_value}% OFF` : `Rs ${v.discount_value}`}
                  </span>
                  <span className="w-full truncate text-[11px] font-semibold text-foreground">{v.title_ur || v.title}</span>
                  <span className="flex w-full items-center justify-between gap-1 text-[10px] text-muted-foreground">
                    <span className="truncate">{v.min_order > 0 ? `Rs ${v.min_order}+ پر` : left !== null ? <><Clock className="inline size-2.5" /> {left} دن</> : v.code}</span>
                    {copiedId === v.id ? <Check className="size-3 text-primary" /> : <Copy className="size-3" />}
                  </span>
                </button>
                {isAdmin && (
                  <div className="absolute end-1 top-1 flex gap-0.5">
                    <button onClick={() => closeVoucher(v.id)} title="بند کریں" className="grid size-5 place-items-center rounded-full bg-muted text-foreground"><X className="size-3" /></button>
                    <button onClick={() => deleteVoucher(v.id)} title="حذف کریں" className="grid size-5 place-items-center rounded-full bg-muted text-destructive"><Trash2 className="size-3" /></button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>بازار کا نیا واؤچر</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="کوڈ * (BAZAR10)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
              <Input placeholder="ٹائٹل *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                className="w-full border rounded-md p-2 bg-background text-foreground text-sm"
                value={form.discountType}
                onChange={(e) => setForm({ ...form, discountType: e.target.value })}
              >
                <option value="percent">فیصد (%)</option>
                <option value="flat">فکسڈ رقم (Rs)</option>
              </select>
              <Input type="number" placeholder="رعایت *" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="کم از کم آرڈر" value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: e.target.value })} />
              <Input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
            </div>
            <Button className="w-full" onClick={createVoucher}>بنائیں</Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default BazarDeals;
