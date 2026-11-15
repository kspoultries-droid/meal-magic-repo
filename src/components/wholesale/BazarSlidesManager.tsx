import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Images, Pencil, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import BazarTargetPicker, { type BazarTarget } from "./BazarTargetPicker";
import { prepareOriginalPhoto } from "@/lib/imageEnhance";
import { BAZAR_CARD_LIMIT, cardDate, cardDatesValid, validCardLink } from "@/lib/bazarCards";
import { tr } from "@/lib/i18n/tr";
import { img } from "@/lib/imageUrl";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

type AdRow = Tables<"promotional_ads">;
const plus30 = () => cardDate(new Date(Date.now() + 30 * 86400000));
const empty = () => ({ id: "", title: "", brand_name: "", image_url: "", link_url: "", cta_text: "", start_date: cardDate(), end_date: plus30(), show_text: true, payment_status: "paid" });

const BazarSlidesManager = ({ onChanged, extra }: { onChanged: () => void; extra?: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<AdRow[]>([]);
  const [form, setForm] = useState<ReturnType<typeof empty> | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"product" | "store">("product");
  const [target, setTarget] = useState<BazarTarget | null>(null);

  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("promotional_ads").select("*").contains("placements", ["bazar_top"]).order("sort_order");
    setLoading(false);
    if (error) { toast.error(tr("Could not load cards: ", "کارڈ نہیں کھلے: ") + error.message); return; }
    setRows(data || []);
  };
  useEffect(() => { if (open) void load(); }, [open]);
  const done = () => { void load(); onChanged(); };
  const reset = () => { setForm(null); setFile(null); setTarget(null); };
  const status = (r: AdRow) => {
    if (!r.image_url) return tr("Missing image", "تصویر موجود نہیں");
    if (!r.is_active) return tr("Paused", "بند");
    if (r.payment_status !== "paid") return tr("Payment pending", "ادائیگی باقی");
    if (r.end_date && r.end_date < cardDate()) return tr("Expired", "ختم");
    if (r.start_date && r.start_date > cardDate()) return tr("Scheduled", "بعد میں شروع");
    return tr("Active", "چل رہا ہے");
  };
  const move = async (i: number, d: -1 | 1) => {
    const j = i + d; if (j < 0 || j >= rows.length || busy) return;
    setBusy(true);
    const list = [...rows]; [list[i], list[j]] = [list[j], list[i]];
    const results = await Promise.all(list.map((r, k) => supabase.from("promotional_ads").update({ sort_order: k }).eq("id", r.id).select("id").single()));
    setBusy(false);
    const failure = results.find(r => r.error);
    if (failure?.error) toast.error(failure.error.message);
    done();
  };
  const toggle = async (r: AdRow, v: boolean) => {
    setBusy(true);
    const { error } = await supabase.from("promotional_ads").update({ is_active: v }).eq("id", r.id).select("id").single();
    setBusy(false);
    if (error) return toast.error(error.message);
    done();
  };
  const remove = async (r: AdRow) => {
    if (!confirm(tr("Delete this card?", "یہ کارڈ حذف کریں؟"))) return;
    setBusy(true);
    const { error } = await supabase.from("promotional_ads").delete().eq("id", r.id).select("id").single();
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(tr("Deleted", "حذف ہو گیا")); done();
  };
  const edit = (r: AdRow) => {
    setFile(null); setMode(r.link_url?.startsWith("/grocery/") ? "store" : "product");
    setTarget(r.link_url ? { name: r.title, store: r.brand_name || "", image: r.image_url || "", link: r.link_url } : null);
    setForm({ id: r.id, title: r.title || "", brand_name: r.brand_name || "", image_url: r.image_url || "", link_url: r.link_url || "", cta_text: r.cta_text || "", start_date: r.start_date || cardDate(), end_date: r.end_date || plus30(), show_text: r.show_text !== false, payment_status: r.payment_status || "pending" });
  };
  const pick = (p: BazarTarget) => {
    if (!form) return;
    setTarget(p);
    setForm({ ...form, link_url: p.link, title: p.name, brand_name: p.store, image_url: p.image, cta_text: mode === "product" ? tr("Shop now", "ابھی خریدیں") : tr("Visit shop", "دکان دیکھیں") });
  };
  const save = async () => {
    if (!form || busy) return;
    if (!form.title.trim() || !form.brand_name.trim()) return toast.error(tr("Title and shop name are required", "عنوان اور دکان کا نام ضروری ہے"));
    if (!file && !form.image_url) return toast.error(tr("Select a picture", "تصویر منتخب کریں"));
    if (!form.link_url || !validCardLink(form.link_url)) return toast.error(tr("Select an item or shop", "آئٹم یا دکان منتخب کریں"));
    if (!cardDatesValid(form.start_date, form.end_date)) return toast.error(tr("End date must be on or after the start date", "اختتامی تاریخ شروع کی تاریخ سے پہلے نہیں ہو سکتی"));
    setBusy(true);
    try {
      let image_url = form.image_url;
      if (file) {
        const prepared = await prepareOriginalPhoto(file);
        const path = `ads/${crypto.randomUUID()}.${prepared.type === "image/webp" ? "webp" : "png"}`;
        const { error } = await supabase.storage.from("product-images").upload(path, prepared, { contentType: prepared.type, upsert: false });
        if (error) throw new Error(tr("Image upload failed: ", "تصویر اپلوڈ نہیں ہوئی: ") + error.message);
        image_url = supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
        // Retain a successful upload if saving the card fails, so retry never uploads twice.
        setForm(previous => previous ? { ...previous, image_url } : previous); setFile(null);
      }
      const data = { title: form.title.trim(), brand_name: form.brand_name.trim(), image_url, link_url: form.link_url, cta_text: form.cta_text.trim() || null, start_date: form.start_date, end_date: form.end_date, show_text: form.show_text, payment_status: form.payment_status };
      const result = form.id
        ? await supabase.from("promotional_ads").update(data).eq("id", form.id).select("id").single()
        : await supabase.from("promotional_ads").insert({ ...data, placements: ["bazar_top"], is_active: true, sort_order: rows.length, ad_type: "banner" }).select("id").single();
      if (result.error) throw result.error;
      toast.success(tr("Card saved", "کارڈ محفوظ ہو گیا")); reset(); done();
    } catch (error) { toast.error(error instanceof Error ? error.message : tr("Could not save the card. Try again.", "کارڈ محفوظ نہیں ہوا، دوبارہ کوشش کریں۔")); }
    finally { setBusy(false); }
  };

  return <>
    <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(true)} className="h-9 shrink-0 gap-1 px-3 text-xs font-bold"><Images className="size-4" />{tr("Cards", "کارڈز")}</Button>
    <Dialog open={open} onOpenChange={v => { if (busy) return; setOpen(v); if (!v) reset(); }}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto" onInteractOutside={e => { if (busy) e.preventDefault(); }}>
        <DialogHeader><DialogTitle>{form ? (form.id ? tr("Edit card", "کارڈ تبدیل کریں") : tr("New card", "نیا کارڈ")) : tr("Bazar cards", "بازار کے کارڈز")}</DialogTitle></DialogHeader>
        {!form ? <div className="space-y-3">
          <Button className="w-full gap-1" disabled={loading || busy || rows.length >= BAZAR_CARD_LIMIT} onClick={() => { setFile(null); setTarget(null); setMode("product"); setForm(empty()); }}><Plus className="size-4" />{tr("Add card", "نیا کارڈ")} ({rows.length}/{BAZAR_CARD_LIMIT})</Button>
          {loading && <p role="status" className="text-sm text-muted-foreground">{tr("Loading…", "کھل رہا ہے…")}</p>}
          {!loading && rows.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">{tr("No cards yet", "ابھی کوئی کارڈ نہیں")}</p>}
          {rows.map((r, i) => <div key={r.id} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2">
            <span className="w-4 shrink-0 text-center text-xs text-muted-foreground">{i + 1}</span>
            <div className="h-12 w-16 shrink-0 overflow-hidden rounded bg-muted">{r.image_url && <img src={img(r.image_url, 200, 60)} alt="" className="size-full object-contain" />}</div>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{r.title}</p><p className="truncate text-xs text-muted-foreground">{r.brand_name}</p><span className="text-xs text-muted-foreground">{status(r)}</span></div>
            <div className="flex shrink-0 flex-col items-center gap-1"><Switch disabled={busy} checked={!!r.is_active} onCheckedChange={v => toggle(r, v)} aria-label={tr("Active", "چالو یا بند")} /><div className="flex">
              <Button size="icon" variant="ghost" className="size-7" disabled={busy || i === 0} title={tr("Move up", "اوپر")} aria-label={tr("Move up", "اوپر")} onClick={() => move(i, -1)}><ArrowUp className="size-4" /></Button>
              <Button size="icon" variant="ghost" className="size-7" disabled={busy || i === rows.length - 1} title={tr("Move down", "نیچے")} aria-label={tr("Move down", "نیچے")} onClick={() => move(i, 1)}><ArrowDown className="size-4" /></Button>
            </div></div>
            <div className="flex shrink-0 flex-col"><Button size="icon" variant="ghost" className="size-8" disabled={busy} aria-label={tr("Edit card", "کارڈ تبدیل کریں")} title={tr("Edit card", "کارڈ تبدیل کریں")} onClick={() => edit(r)}><Pencil className="size-4" /></Button><Button size="icon" variant="ghost" className="size-8 text-destructive" disabled={busy} aria-label={tr("Delete card", "کارڈ حذف کریں")} title={tr("Delete card", "کارڈ حذف کریں")} onClick={() => remove(r)}><Trash2 className="size-4" /></Button></div>
          </div>)}
          {extra && <div className="border-t border-border pt-3">{extra}</div>}
        </div> : <fieldset disabled={busy} className="min-w-0 space-y-4">
          <div className="space-y-2"><p className="text-xs font-bold">{tr("Open on click", "دبانے پر کیا کھلے؟")}</p><div className="flex gap-2">
            <Button type="button" variant={mode === "product" ? "default" : "outline"} aria-pressed={mode === "product"} onClick={() => setMode("product")}>{tr("Product", "آئٹم")}</Button>
            <Button type="button" variant={mode === "store" ? "default" : "outline"} aria-pressed={mode === "store"} onClick={() => setMode("store")}>{tr("Shop", "دکان")}</Button>
          </div>
          {target && <div className="flex items-center gap-2 border-b border-border py-2"><span className="min-w-0 flex-1 break-words text-sm font-semibold">{target.name}{target.store !== target.name && <span className="block text-xs text-muted-foreground">{target.store}</span>}</span><Button type="button" size="icon" variant="ghost" aria-label={tr("Remove selection", "انتخاب ہٹائیں")} title={tr("Remove selection", "انتخاب ہٹائیں")} onClick={() => { setTarget(null); setForm({ ...form, link_url: "" }); }}><X className="size-4" /></Button></div>}
          <BazarTargetPicker key={mode} mode={mode} onPick={pick} /></div>
          <label className="block space-y-2"><span className="text-xs font-bold">{tr("Picture", "تصویر")} *</span><div className="aspect-[9/5] overflow-hidden rounded-lg border border-dashed border-border bg-muted">{preview || form.image_url ? <img src={preview || form.image_url} alt={tr("Card preview", "کارڈ کی تصویر")} className="size-full object-contain" /> : <Images className="mx-auto h-full w-10 text-muted-foreground" />}</div><input type="file" accept="image/*" aria-label={tr("Upload picture", "تصویر اپلوڈ کریں")} className="block w-full min-w-0 text-xs" onChange={e => { const selected = e.target.files?.[0]; if (selected && !selected.type.startsWith("image/")) { toast.error(tr("Choose an image file", "تصویر کی فائل منتخب کریں")); return; } setFile(selected || null); }} /></label>
          <label className="block space-y-1"><span className="text-xs font-bold">{tr("Title", "عنوان")} *</span><Input aria-label={tr("Title", "عنوان")} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label>
          <label className="block space-y-1"><span className="text-xs font-bold">{tr("Shop name", "دکان کا نام")} *</span><Input aria-label={tr("Shop name", "دکان کا نام")} value={form.brand_name} onChange={e => setForm({ ...form, brand_name: e.target.value })} /></label>
          <label className="block space-y-1"><span className="text-xs font-bold">{tr("Button label", "بٹن کی لکھائی")}</span><Input aria-label={tr("Button label", "بٹن کی لکھائی")} value={form.cta_text} onChange={e => setForm({ ...form, cta_text: e.target.value })} /></label>
          <div className="grid grid-cols-2 gap-2"><label className="min-w-0 text-xs">{tr("Start", "شروع")}<Input aria-label={tr("Start date", "شروع کی تاریخ")} className="min-w-0" type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></label><label className="min-w-0 text-xs">{tr("End", "ختم")}<Input aria-label={tr("End date", "ختم ہونے کی تاریخ")} className="min-w-0" type="date" min={form.start_date} value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></label></div>
          <label className="flex items-center justify-between gap-3 text-sm">{tr("Show title on picture", "تصویر پر عنوان دکھائیں")}<Switch disabled={busy} checked={form.show_text} onCheckedChange={v => setForm({ ...form, show_text: v })} /></label>
          <div className="flex gap-2"><Button type="button" variant="outline" className="flex-1" onClick={reset}>{tr("Back", "واپس")}</Button><Button type="button" className="flex-1" disabled={busy} onClick={save}>{busy ? tr("Saving…", "محفوظ ہو رہا ہے…") : tr("Save", "محفوظ کریں")}</Button></div>
        </fieldset>}
      </DialogContent>
    </Dialog>
  </>;
};
export default BazarSlidesManager;
