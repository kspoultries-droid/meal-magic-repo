import { tr } from "@/lib/i18n/tr";
import { displayText } from "@/lib/i18n/displayText";
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
      toast.error(tr("Code, title and discount are required", "کوڈ، ٹائٹل اور رعایت ضروری ہے"));
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
    toast.success(tr("Bazar voucher created", "بازار واؤچر بن گیا 🎟️"));
    setForm({ code: "", title: "", discountType: "percent", discountValue: "", minOrder: "0", validUntil: "" });
    setDialogOpen(false);
    fetchVouchers();
  };

  const closeVoucher = async (id: string) => {
    const { error } = await (supabase.from("vouchers" as any).update({ is_active: false }).eq("id", id) as any);
    if (error) { toast.error(error.message); return; }
    toast.success(tr("Voucher closed", "واؤچر بند کر دیا گیا"));
    fetchVouchers();
  };

  const deleteVoucher = async (id: string) => {
    if (!confirm(tr("Delete this voucher?", "کیا آپ واقعی یہ واؤچر حذف کرنا چاہتے ہیں؟"))) return;
    const { error } = await (supabase.from("vouchers" as any).delete().eq("id", id) as any);
    if (error) { toast.error(error.message); return; }
    toast.success(tr("Voucher deleted", "واؤچر حذف ہو گیا"));
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
    toast.success(tr(`Code "${v.code}" copied — apply at checkout`, `کوڈ "${v.code}" کاپی ہو گیا — چیک آؤٹ پر لگائیں 🎟️`));
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!loaded) return null;
  if (vouchers.length === 0 && !isAdmin) return null;

  const daysLeft = (until: string | null) => {
    if (!until) return null;
    const d = Math.ceil((new Date(until).getTime() - Date.now()) / 86400000);
    return d > 0 ? d : null;
  };

  const collected = (() => { try { return new Set<string>(JSON.parse(localStorage.getItem("bazar_collected_vouchers") || "[]")); } catch { return new Set<string>(); } })();
  const collect = async (list: Voucher[]) => {
    list.forEach((v) => collected.add(v.code));
    localStorage.setItem("bazar_collected_vouchers", JSON.stringify([...collected]));
    try { await navigator.clipboard.writeText(list.map((v) => v.code).join(" ")); } catch { /* ignore */ }
    setCopiedId(list.length === 1 ? list[0].id : "all");
    toast.success(list.length === 1 ? tr(`Collected ${list[0].code} — enter it at checkout`, `${list[0].code} حاصل — چیک آؤٹ پر لگائیں`) : tr("All vouchers collected — codes copied", "تمام واؤچر حاصل — کوڈ کاپی ہو گئے"));
  };
  const amount = (v: Voucher) => <bdi dir="ltr">{v.discount_type === "percent" ? <>{v.discount_value}<span className="text-sm">% OFF</span></> : <><span className="text-sm">Rs.</span>{v.discount_value}</>}</bdi>;
  const done = (v: Voucher) => collected.has(v.code) || copiedId === v.id || copiedId === "all";

  return (
    <section className="px-3 py-3 sm:px-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary-glow p-[3px] shadow-card">
        <div className="rounded-[14px] bg-gradient-to-b from-primary/90 to-primary px-3 pb-3 pt-2.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-1.5 text-sm font-extrabold text-primary-foreground"><Ticket className="size-4" /> {tr("Voucher Hub", "واؤچر سینٹر")}</h2>
            {isAdmin && <button onClick={() => setDialogOpen(true)} className="flex items-center gap-0.5 rounded-full bg-primary-foreground/20 px-2 py-0.5 text-[11px] font-bold text-primary-foreground"><Plus className="size-3" /> {tr("New", "نیا")}</button>}
          </div>
          {vouchers.length === 0 ? <p className="rounded-xl bg-card py-3 text-center text-xs text-muted-foreground">{tr("No vouchers yet", "ابھی کوئی واؤچر نہیں")}</p> : <>
            <div className="flex items-stretch rounded-xl bg-card shadow-soft">
              {vouchers.slice(0, 2).map((v) => <div key={v.id} className="min-w-0 flex-1 border-e border-dashed border-border px-3 py-2"><p className="text-xl font-black leading-none text-destructive">{amount(v)}</p><p className="mt-1 truncate text-[11px] font-semibold text-muted-foreground">{tr(v.title, v.title_ur || v.title)}</p></div>)}
              <div className="grid shrink-0 place-items-center px-2"><Button size="sm" onClick={() => collect(vouchers)} className="h-9 rounded-full bg-gradient-to-r from-warning to-destructive px-4 text-xs font-extrabold text-destructive-foreground shadow-soft">{copiedId === "all" ? <Check className="size-4" /> : tr("Collect All", "سب حاصل کریں")}</Button></div>
            </div>
            <div className="no-scrollbar mt-2.5 flex gap-2 overflow-x-auto">
              {vouchers.map((v) => { const left = daysLeft(v.valid_until); return (
                <div key={v.id} className="relative flex w-64 shrink-0 overflow-hidden rounded-xl bg-card shadow-soft">
                  <span className="absolute start-0 top-0 rounded-ee-lg bg-gradient-to-r from-warning to-destructive px-2 py-0.5 text-[9px] font-bold text-destructive-foreground">{tr("Bazar Voucher", "بازار واؤچر")}</span>
                  <div className="flex w-24 shrink-0 flex-col items-center justify-center border-e border-dashed border-destructive/30 px-2 pt-4 pb-2 text-center">
                    <p className="text-xl font-black leading-none text-destructive">{amount(v)}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{v.min_order > 0 ? <>{tr("Min.", "کم از کم")} <b className="text-foreground">Rs.{v.min_order}</b></> : tr("No minimum", "کوئی حد نہیں")}</p>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-between p-2 pt-4">
                    <p className="truncate text-xs font-bold text-foreground">{tr(v.title, v.title_ur || v.title)}</p>
                    <p className="flex items-center gap-1 text-[10px] text-muted-foreground"><Clock className="size-2.5" />{left !== null ? <>{left} {tr("days left", "دن باقی")}</> : v.code}</p>
                    <Button size="sm" variant={done(v) ? "outline" : "destructive"} onClick={() => collect([v])} className="mt-1 h-7 self-end rounded-full px-4 text-[11px] font-bold">{done(v) ? <><Check className="size-3" /> {tr("Collected", "حاصل")}</> : tr("Collect", "حاصل کریں")}</Button>
                  </div>
                  {isAdmin && <div className="absolute end-1 top-1 flex gap-0.5"><button onClick={() => closeVoucher(v.id)} title={tr("Close", "بند کریں")} className="grid size-5 place-items-center rounded-full bg-muted text-foreground"><X className="size-3" /></button><button onClick={() => deleteVoucher(v.id)} title={tr("Delete", "حذف کریں")} className="grid size-5 place-items-center rounded-full bg-muted text-destructive"><Trash2 className="size-3" /></button></div>}
                </div>); })}
            </div>
          </>}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{tr("New Bazar voucher", "بازار کا نیا واؤچر")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder={tr("Code * (BAZAR10)", "کوڈ * (BAZAR10)")} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
              <Input placeholder={tr("Title *", "ٹائٹل *")} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                className="w-full border rounded-md p-2 bg-background text-foreground text-sm"
                value={form.discountType}
                onChange={(e) => setForm({ ...form, discountType: e.target.value })}
              >
                <option value="percent">{tr("Percent (%)", "فیصد (%)")}</option>
                <option value="flat">{tr("Fixed amount (Rs)", "فکسڈ رقم (Rs)")}</option>
              </select>
              <Input type="number" placeholder={tr("Discount *", "رعایت *")} value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder={tr("Minimum order", "کم از کم آرڈر")} value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: e.target.value })} />
              <Input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
            </div>
            <Button className="w-full" onClick={createVoucher}>{tr("Create", "بنائیں")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default BazarDeals;
