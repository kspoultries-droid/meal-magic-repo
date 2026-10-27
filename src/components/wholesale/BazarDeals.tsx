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
    <section className="py-3">
      <div className="container mx-auto px-4 flex items-center gap-2 mb-2.5">
        <div className="w-7 h-7 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
          <Ticket className="w-4 h-4 text-primary-foreground" />
        </div>
        <h2 className="text-base font-extrabold text-foreground">واؤچرز اور ڈیلز</h2>
        <span className="text-[11px] text-muted-foreground">Vouchers & Deals</span>
      </div>

      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2">
        {vouchers.map((v, i) => {
          const left = daysLeft(v.valid_until);
          return (
            <div
              key={v.id}
              style={{ animationDelay: `${i * 60}ms` }}
              className={`animate-fade-in relative shrink-0 w-64 rounded-2xl bg-gradient-to-br ${gradients[i % gradients.length]} p-4 text-primary-foreground shadow-card overflow-hidden`}
            >
              {/* ticket notches */}
              <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-background" />
              <div className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-background" />
              <div className="pointer-events-none absolute -top-8 -right-8 w-24 h-24 rounded-full bg-primary-foreground/15 blur-2xl" />

              <p className="text-xl font-extrabold leading-tight">
                {v.discount_type === "percent" ? `${v.discount_value}% رعایت` : `Rs ${v.discount_value} رعایت`}
              </p>
              <p className="text-xs font-bold opacity-95 truncate">{v.title_ur || v.title}</p>
              {v.min_order > 0 && (
                <p className="text-[10px] opacity-80 mt-0.5">کم از کم آرڈر: Rs {v.min_order}</p>
              )}

              <button
                onClick={() => copyCode(v)}
                className="mt-2.5 flex items-center justify-between w-full rounded-lg border border-dashed border-primary-foreground/50 bg-primary-foreground/15 backdrop-blur-sm px-3 py-1.5 active:scale-95 transition-transform"
              >
                <span className="font-mono font-extrabold tracking-widest text-sm">{v.code}</span>
                {copiedId === v.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4 opacity-80" />}
              </button>

              {isAdmin && (
                <div className="absolute top-2 left-2 flex gap-1">
                  <button
                    onClick={() => closeVoucher(v.id)}
                    title="بند کریں"
                    className="w-6 h-6 rounded-full bg-background/85 text-foreground flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteVoucher(v.id)}
                    title="حذف کریں"
                    className="w-6 h-6 rounded-full bg-background/85 text-destructive flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {left !== null && (
                <p className="flex items-center gap-1 text-[9px] font-semibold opacity-80 mt-1.5">
                  <Clock className="w-2.5 h-2.5" /> {left} دن باقی
                </p>
              )}
            </div>
          );
        })}

        {isAdmin && (
          <button
            onClick={() => setDialogOpen(true)}
            className="shrink-0 w-40 rounded-2xl border-2 border-dashed border-primary/50 bg-card text-primary flex flex-col items-center justify-center gap-1 py-6 active:scale-95 transition-transform"
          >
            <Plus className="w-6 h-6" />
            <span className="text-xs font-bold">نیا واؤچر</span>
            <span className="text-[10px] opacity-70">Add voucher</span>
          </button>
        )}
      </div>

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
