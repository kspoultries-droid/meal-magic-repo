import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Images, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import AdProductPicker from "@/components/admin/AdProductPicker";
import { img } from "@/lib/imageUrl";
import { toast } from "sonner";

const MAX = 15;
const today = () => new Date().toISOString().slice(0, 10);
const plus30 = () => new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
const empty = { id: "", title: "", brand_name: "", image_url: "", link_url: "", cta_text: "", start_date: today(), end_date: plus30(), show_text: true, paid: true };

/** Admin manager for the rotating Bazar top banner (promotional_ads with placement "bazar_top"). */
const BazarSlidesManager = ({ onChanged, extra }: { onChanged: () => void; extra?: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState<typeof empty | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("promotional_ads").select("*").contains("placements", ["bazar_top"]).order("sort_order");
    setRows(data || []);
  };
  useEffect(() => { if (open) load(); }, [open]);
  const done = () => { load(); onChanged(); };

  const status = (r: any) => {
    if (!r.is_active) return ["بند", "bg-muted text-muted-foreground"];
    if (r.payment_status !== "paid") return ["ادائیگی باقی", "bg-accent text-accent-foreground"];
    if (r.end_date && r.end_date < today()) return ["ختم", "bg-destructive/15 text-destructive"];
    if (r.start_date && r.start_date > today()) return ["بعد میں شروع", "bg-secondary text-secondary-foreground"];
    return ["چل رہی ہے", "bg-primary/15 text-primary"];
  };

  const move = async (i: number, d: -1 | 1) => {
    const j = i + d; if (j < 0 || j >= rows.length) return;
    const list = [...rows]; [list[i], list[j]] = [list[j], list[i]];
    setRows(list);
    await Promise.all(list.map((r, k) => supabase.from("promotional_ads").update({ sort_order: k }).eq("id", r.id)));
    onChanged();
  };
  const toggle = async (r: any, v: boolean) => { await supabase.from("promotional_ads").update({ is_active: v }).eq("id", r.id); done(); };
  const remove = async (r: any) => {
    if (!confirm("یہ کارڈ حذف کریں؟")) return;
    const { error } = await supabase.from("promotional_ads").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("حذف ہو گیا"); done();
  };

  const edit = (r: any) => {
    setFile(null);
    setForm({ id: r.id, title: r.title || "", brand_name: r.brand_name || "", image_url: r.image_url || "", link_url: r.link_url || "", cta_text: r.cta_text || "",
      start_date: r.start_date || today(), end_date: r.end_date || plus30(), show_text: r.show_text !== false, paid: r.payment_status === "paid" });
  };

  const save = async () => {
    if (!form) return;
    if (!form.title.trim() || !form.brand_name.trim()) return toast.error("عنوان اور برانڈ/دکان کا نام ضروری ہے");
    if (!file && !form.image_url) return toast.error("تصویر لگائیں");
    setBusy(true);
    let image_url = form.image_url;
    if (file) {
      const path = `ads/${crypto.randomUUID()}.${file.name.split(".").pop() || "jpg"}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) { setBusy(false); return toast.error("تصویر اپلوڈ ناکام"); }
      image_url = supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
    }
    const data = { title: form.title.trim(), brand_name: form.brand_name.trim(), image_url, link_url: form.link_url.trim() || null,
      cta_text: form.cta_text.trim() || null, start_date: form.start_date, end_date: form.end_date, show_text: form.show_text,
      payment_status: form.paid ? "paid" : "pending" };
    const { error } = form.id
      ? await supabase.from("promotional_ads").update(data).eq("id", form.id)
      : await supabase.from("promotional_ads").insert({ ...data, placements: ["bazar_top"], is_active: true, sort_order: rows.length, ad_type: "banner" });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("محفوظ ہو گیا"); setForm(null); setFile(null); done();
  };

  const preview = file ? URL.createObjectURL(file) : form?.image_url;

  return (
    <>
      <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(true)} className="h-9 shrink-0 gap-1 rounded-full px-3 text-[11px] font-bold shadow-sm">
        <Images className="size-4" /> کارڈز
      </Button>
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setForm(null); }}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle className="text-base">{form ? (form.id ? "کارڈ تبدیل کریں" : "نیا کارڈ") : "بازار کے اوپر والے گھومنے والے کارڈز"}</DialogTitle></DialogHeader>

          {!form ? (
            <div className="space-y-3">
              <p className="rounded-lg bg-muted p-2.5 text-xs leading-6 text-muted-foreground">
                یہاں لگے کارڈ اوپر ترتیب سے گھومتے ہیں (زیادہ سے زیادہ {MAX})۔ اگر کارڈ {MAX} سے کم ہوں تو باقی جگہ EasyLife کے اپنے 5 کارڈ بھرتے ہیں۔ تصویر کا بہترین سائز: 1080×600۔
              </p>
              <Button className="w-full gap-1" disabled={rows.length >= MAX} onClick={() => { setFile(null); setForm({ ...empty, start_date: today(), end_date: plus30() }); }}>
                <Plus className="size-4" /> نیا کارڈ لگائیں ({rows.length}/{MAX})
              </Button>
              {rows.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">ابھی کوئی کارڈ نہیں</p>}
              {rows.map((r, i) => {
                const [label, cls] = status(r);
                return (
                  <div key={r.id} className="flex items-center gap-2 rounded-xl border border-border bg-card p-2">
                    <span className="w-5 text-center text-xs font-bold text-muted-foreground">{i + 1}</span>
                    <div className="h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">{r.image_url && <img src={img(r.image_url, 200, 60)} alt="" className="size-full object-cover" />}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{r.title}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{r.brand_name}</p>
                      <span className={`mt-0.5 inline-block rounded px-1.5 text-[10px] font-bold ${cls}`}>{label}</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <Switch checked={!!r.is_active} onCheckedChange={(v) => toggle(r, v)} aria-label="چالو/بند" />
                      <div className="flex">
                        <button aria-label="اوپر" onClick={() => move(i, -1)} className="grid size-7 place-items-center text-muted-foreground"><ArrowUp className="size-4" /></button>
                        <button aria-label="نیچے" onClick={() => move(i, 1)} className="grid size-7 place-items-center text-muted-foreground"><ArrowDown className="size-4" /></button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button aria-label="تبدیل کریں" onClick={() => edit(r)} className="grid size-8 place-items-center rounded-full bg-secondary"><Pencil className="size-4" /></button>
                      <button aria-label="حذف کریں" onClick={() => remove(r)} className="grid size-8 place-items-center rounded-full bg-destructive/10 text-destructive"><Trash2 className="size-4" /></button>
                    </div>
                  </div>
                );
              })}
              {extra && <div className="border-t border-border pt-3"><p className="mb-2 text-xs text-muted-foreground">EasyLife کے اپنے کارڈز کا رنگ:</p>{extra}</div>}
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-bold">تصویر *</span>
                <div className="mt-1 aspect-[9/5] overflow-hidden rounded-xl border border-dashed border-border bg-muted">
                  {preview ? <img src={preview} alt="" className="size-full object-cover" /> : <span className="grid size-full place-items-center text-xs text-muted-foreground">تصویر منتخب کریں (1080×600)</span>}
                </div>
                <input type="file" accept="image/*" className="mt-1 text-xs" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </label>
              <Input placeholder="عنوان * (مثلاً: Jazz Cash پر 20% کیش بیک)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Input placeholder="برانڈ / دکان کا نام *" value={form.brand_name} onChange={(e) => setForm({ ...form, brand_name: e.target.value })} />
              <div>
                <p className="mb-1 text-xs font-bold">کلک پر کیا کھلے؟ — دکان کی پروڈکٹ چنیں</p>
                <AdProductPicker onPick={(p) => setForm({ ...form, link_url: `/product/${p.id}`, title: form.title || p.name, brand_name: form.brand_name || p.store, image_url: form.image_url || p.image || "" })} />
                <Input className="mt-1" dir="ltr" placeholder="/product/... یا https://..." value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} />
              </div>
              <Input placeholder="بٹن کی لکھائی (ابھی خریدیں)" value={form.cta_text} onChange={(e) => setForm({ ...form, cta_text: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs">شروع<Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></label>
                <label className="text-xs">ختم<Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></label>
              </div>
              <label className="flex items-center justify-between text-sm">تصویر کے اوپر عنوان لکھیں<Switch checked={form.show_text} onCheckedChange={(v) => setForm({ ...form, show_text: v })} /></label>
              <label className="flex items-center justify-between text-sm">ادائیگی ہو چکی (ورنہ کارڈ نہیں دکھے گا)<Switch checked={form.paid} onCheckedChange={(v) => setForm({ ...form, paid: v })} /></label>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setForm(null)}>واپس</Button>
                <Button className="flex-1" disabled={busy} onClick={save}>{busy ? "محفوظ ہو رہا ہے..." : "محفوظ کریں"}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BazarSlidesManager;
