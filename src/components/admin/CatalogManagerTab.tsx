import { tr } from "@/lib/i18n/tr";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { img } from "@/lib/imageUrl";
import { matchesSearch } from "@/lib/searchMatch";
import { validBarcode, catalogImages, sameCatalogProduct } from "@/lib/catalogOnboarding";
import { readBarcode } from "@/lib/barcodeReader";
import { barcodeConflict, nextReviewItem, normalizedCatalogBarcode } from "@/lib/catalogReview";
import { specTemplateFor } from "@/lib/catalogSpecs";
import { ArrowLeft, ArrowRight, BadgeCheck, ImagePlus, Loader2, Plus, ScanBarcode, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Item = { id?: string; name: string; name_ur: string | null; brand: string | null; category: string; unit: string | null; barcode: string | null; description: string | null; image_url: string | null; images: string[]; image_verified: boolean; specs: Record<string, string>; weight_kg: number | null };
const blank: Item = { name: "", name_ur: "", brand: "", category: "General", unit: "", barcode: "", description: "", image_url: null, images: [], image_verified: false, specs: {}, weight_kg: null };

export default function CatalogManagerTab() {
  const [items, setItems] = useState<Item[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "unverified" | "nophoto" | "nobarcode" | "duplicates">("all");
  const [edit, setEdit] = useState<Item | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const scanRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = async () => {
    setLoading(true); setLoadError(false);
    const { data, error } = await (supabase as any).from("catalog_items").select("*").order("category").order("name").order("id").limit(5000);
    setLoading(false);
    if (error) { setLoadError(true); return; }
    setItems(data || []);
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(0); }, [q, filter]);

  const matching = useMemo(() => items.filter((i) =>
    (filter === "all" || (filter === "unverified" ? !i.image_verified : filter === "nophoto" ? !catalogImages(i).length : filter === "nobarcode" ? !i.barcode : items.some((other) => other.id !== i.id && sameCatalogProduct(i, other)))) &&
    (!q || matchesSearch(q, i.name, i.name_ur, i.brand, i.category, i.barcode))), [items, q, filter]);
  const currentPage = Math.min(page, Math.max(0, Math.ceil(matching.length / 50) - 1));
  const shown = matching.slice(currentPage * 50, (currentPage + 1) * 50);
  const verified = items.filter((i) => i.image_verified && i.image_url).length;

  const upload = async (file: File) => {
    if (!edit || lock.current) return;
    const original = edit;
    if ((edit.images?.length || (edit.image_url ? 1 : 0)) >= 8) return toast.error(tr("Maximum 8 photos", "زیادہ سے زیادہ 8 تصاویر"));
    lock.current = true; setBusy(true);
    try {
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `catalog/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type, upsert: false });
    if (error) return toast.error(error.message);
    const url = supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
    const images = [...(original.images?.length ? original.images : original.image_url ? [original.image_url] : []), url];
    setEdit({ ...original, images, image_url: images[0], image_verified: false });
    } catch { toast.error(tr("Photo upload failed", "تصویر اپ لوڈ نہیں ہو سکی")); }
    finally { lock.current = false; setBusy(false); }
  };

  const scan = async (file: File) => {
    if (!edit || lock.current) return;
    const original = edit;
    lock.current = true; setBusy(true);
    try {
      const code = await readBarcode(file);
      if (!code) return toast.error(tr("Barcode could not be read. Enter its number.", "بارکوڈ نہیں پڑھا جا سکا؛ اس کا نمبر لکھیں۔"));
      if (barcodeConflict(items, code, original.id)) return toast.error(tr("Barcode belongs to another catalog item", "یہ بارکوڈ فہرست کی دوسری چیز کا ہے"));
      setEdit({ ...original, barcode: code });
      toast.success(tr("Barcode read. Check the pack size before saving.", "بارکوڈ پڑھ لیا؛ محفوظ کرنے سے پہلے پیک سائز دیکھ لیں۔"));
    } catch { toast.error(tr("Barcode could not be read", "بارکوڈ نہیں پڑھا جا سکا")); }
    finally { lock.current = false; setBusy(false); if (scanRef.current) scanRef.current.value = ""; }
  };

  const save = async (advance = false) => {
    if (lock.current) return;
    if (edit?.barcode && !validBarcode(edit.barcode)) return toast.error(tr("Check barcode digits and checksum", "بارکوڈ کے ہندسے درست کریں"));
    if (!edit || !edit.name.trim()) return toast.error(tr("Name is required", "نام لازمی ہے"));
    if (edit.image_verified && !edit.image_url) return toast.error(tr("Photo required for verification", "تصدیق کے لیے تصویر لازمی ہے"));
    if (barcodeConflict(items, edit.barcode || "", edit.id)) return toast.error(tr("Barcode belongs to another catalog item", "یہ بارکوڈ فہرست کی دوسری چیز کا ہے"));
    lock.current = true; setBusy(true);
    try {
    const barcode = normalizedCatalogBarcode(edit.barcode);
    if (barcode) {
      let query = (supabase as any).from("catalog_items").select("id").eq("barcode", barcode);
      if (edit.id) query = query.neq("id", edit.id);
      const { data, error } = await query.limit(1);
      if (error) throw error;
      if (data?.length) throw new Error(tr("Barcode belongs to another catalog item", "یہ بارکوڈ فہرست کی دوسری چیز کا ہے"));
    }
    if (edit.image_verified) {
      try {
        for (const url of catalogImages(edit)) await new Promise<void>((resolve, reject) => {
          const image = new Image();
          const timer = window.setTimeout(() => reject(new Error("Image timed out")), 12000);
          image.onload = () => { window.clearTimeout(timer); image.naturalWidth > 0 ? resolve() : reject(new Error("Empty image")); };
          image.onerror = () => { window.clearTimeout(timer); reject(new Error("Image unavailable")); };
          image.src = url;
        });
      } catch {
        return toast.error(tr("A photo could not be opened. Replace it before verification.", "تصویر نہیں کھل سکی؛ تصدیق سے پہلے درست تصویر لگائیں۔"));
      }
    }
    const { id, ...row } = edit;
    const images = row.images?.length ? row.images : row.image_url ? [row.image_url] : [];
    const payload = { ...row, images, image_url: images[0] || null, name: row.name.trim(), barcode, updated_at: new Date().toISOString() };
    const query = id ? (supabase as any).from("catalog_items").update(payload).eq("id", id) : (supabase as any).from("catalog_items").insert(payload);
    const { data, error } = await query.select("*").single();
    if (error || !data) throw error || new Error(tr("Save failed", "محفوظ نہیں ہوا"));
    const next = advance ? nextReviewItem(matching, id) : null;
    setItems((old) => id ? old.map((i) => i.id === id ? data : i) : [...old, data]);
    toast.success(tr("Saved", "محفوظ ہو گیا"));
    setEdit(next ? { ...blank, ...next, specs: next.specs || {}, images: next.images || [] } : null);
    } catch (error) { toast.error(error instanceof Error ? error.message : tr("Save failed. Draft retained.", "محفوظ نہیں ہوا؛ مسودہ برقرار ہے۔")); }
    finally { lock.current = false; setBusy(false); }
  };

  const remove = async () => {
    if (lock.current || !edit?.id || !confirm(tr("Delete this item from catalog? Existing store listings will not be removed.", "یہ چیز فہرست سے حذف کریں؟ دکانوں میں پہلے سے لگی چیزیں نہیں ہٹیں گی۔"))) return;
    const { error } = await (supabase as any).from("catalog_items").delete().eq("id", edit.id);
    if (error) return toast.error(error.message);
    setEdit(null); load();
  };

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const loadSuggestions = () => (supabase as any).from("catalog_suggestions").select("*").eq("status", "pending").order("created_at").limit(100).then(({ data }: any) => setSuggestions(data || []));
  useEffect(() => { loadSuggestions(); }, []);
  const review = async (s: any, approve: boolean, verify: boolean) => {
    const note = approve ? null : prompt(tr("Rejection reason (optional)", "مسترد کرنے کی وجہ (اختیاری)")) || null;
    const { error } = await (supabase as any).rpc("review_catalog_suggestion", { _id: s.id, _approve: approve, _verify_photo: verify, _note: note });
    if (error) return toast.error(error.message);
    toast.success(approve ? tr("Added to catalog", "فہرست میں شامل ہو گیا") : tr("Rejected", "مسترد"));
    loadSuggestions(); load();
  };

  const fields = specTemplateFor(edit?.category);

  return (
    <div className="space-y-3" dir={tr("ltr", "rtl")}>
      <div className="rounded-xl border bg-card p-3 text-xs text-muted-foreground">
        {tr("Standard catalog:", "معیاری فہرست:")} {items.length} {tr("Items ·", "چیزیں ·")} {verified} {tr("Original photo verified. Vendors only see the verified photo; otherwise, they upload their own.\n        For the original photo, take a clear front picture of the actual packaging in-store or use the brand's official image.", "کی اصل تصویر تصدیق شدہ۔ دکانداروں کو صرف تصدیق شدہ تصویر دکھتی ہے؛ باقی کی وہ اپنی تصویر لگاتے ہیں۔\n        اصل تصویر کے لیے دکان میں اصل پیکنگ کی سامنے سے صاف تصویر کھینچیں یا برانڈ کی اپنی سرکاری تصویر استعمال کریں۔")}
      </div>
      {suggestions.length > 0 && (
        <div className="space-y-2 rounded-xl border border-primary/40 bg-primary/5 p-2">
          <p className="text-xs font-bold">{tr("Vendor Submissions (", "دکانداروں کی بھیجی ہوئی چیزیں (")}{suggestions.length})</p>
          {suggestions.map((s) => (
            <div key={s.id} className="rounded-lg border bg-card p-2 space-y-1.5">
              <div className="flex gap-1.5 overflow-x-auto">{(s.images || []).map((u: string) => <img key={u} src={img(u, 160)} alt="" className="h-16 w-16 shrink-0 rounded-md object-contain bg-muted" />)}</div>
              <p className="text-xs font-semibold">{s.name}{s.brand ? ` · ${s.brand}` : ""}</p>
              <p className="text-[10px] text-muted-foreground">{s.category}{s.unit ? ` · ${s.unit}` : ""}{s.barcode ? ` · ${s.barcode}` : ""}</p>
              {s.description && <p className="line-clamp-2 text-[10px] text-muted-foreground">{s.description}</p>}
              <div className="grid grid-cols-3 gap-1.5">
                <Button size="sm" className="h-8 text-[11px]" onClick={() => review(s, true, true)}>{tr("Original Image · Approved", "اصل تصویر · منظور")}</Button>
                <Button size="sm" variant="secondary" className="h-8 text-[11px]" onClick={() => review(s, true, false)}>{tr("Description Approved Only", "صرف تفصیل منظور")}</Button>
                <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={() => review(s, false, false)}>{tr("Rejected", "مسترد")}</Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <div className="relative flex-1"><Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pr-9" placeholder={tr("Name, Brand, Barcode", "نام، برانڈ، بارکوڈ")} value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Button onClick={() => setEdit({ ...blank })}><Plus className="h-4 w-4" /> {tr("New Item", "نئی چیز")}</Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {([["all", tr("All", "سب")], ["unverified", tr("Pending Verification", "تصدیق باقی")], ["nophoto", tr("No verified photo", "تصدیق شدہ تصویر نہیں")], ["nobarcode", tr("No barcode", "بارکوڈ نہیں")], ["duplicates", tr("Similar items", "ملتی جلتی اشیا")]] as const).map(([k, l]) => (
          <Button key={k} size="sm" variant={filter === k ? "default" : "outline"} onClick={() => setFilter(k)} className="text-xs">{l}</Button>
        ))}
      </div>
      <div className="divide-y rounded-xl border bg-card">
        {loading && <p role="status" className="p-3 text-sm text-muted-foreground">{tr("Loading catalog…", "فہرست آ رہی ہے…")}</p>}
        {loadError && <div role="alert" className="flex items-center gap-2 p-3 text-sm text-destructive">{tr("Catalog could not be loaded", "فہرست نہیں آ سکی")}<Button variant="outline" onClick={load}>{tr("Retry", "دوبارہ کوشش")}</Button></div>}
        {!loading && !loadError && !matching.length && <p className="p-3 text-sm text-muted-foreground">{tr("No matching items", "کوئی متعلقہ چیز نہیں ملی")}</p>}
        {shown.map((i) => (
          <Button variant="ghost" key={i.id} onClick={() => setEdit({ ...blank, ...i, specs: i.specs || {}, images: i.images || [] })} className="flex h-auto w-full items-center justify-start gap-2 whitespace-normal rounded-none p-2 text-start">
            {i.image_url ? <img src={img(i.image_url, 80)} alt="" loading="lazy" className="h-10 w-10 rounded-md object-cover" /> : <div className="h-10 w-10 rounded-md bg-muted" />}
            <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{i.name}{i.name_ur ? ` · ${i.name_ur}` : ""}</p><p className="text-[10px] text-muted-foreground">{i.brand ? `${i.brand} · ` : ""}{i.category}{i.unit ? ` · ${i.unit}` : ""}</p></div>
            {i.image_verified && i.image_url ? <BadgeCheck className="h-4 w-4 text-primary" /> : <span className="text-[10px] text-muted-foreground">{tr("Pending Verification", "تصدیق باقی")}</span>}
          </Button>
        ))}
      </div>
      {matching.length > 0 && <div className="flex items-center justify-between gap-2 text-xs">
        <Button variant="outline" size="icon" aria-label={tr("Previous catalog page", "فہرست کا پچھلا صفحہ")} disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><ArrowLeft className="h-4 w-4" /></Button>
        <span>{currentPage * 50 + 1}–{Math.min((currentPage + 1) * 50, matching.length)} / {matching.length}</span>
        <Button variant="outline" size="icon" aria-label={tr("Next catalog page", "فہرست کا اگلا صفحہ")} disabled={(currentPage + 1) * 50 >= matching.length} onClick={() => setPage(currentPage + 1)}><ArrowRight className="h-4 w-4" /></Button>
      </div>}

      <Dialog open={!!edit} onOpenChange={(o) => !o && !lock.current && setEdit(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto" dir={tr("ltr", "rtl")} onEscapeKeyDown={(e) => { if (busy) e.preventDefault(); }} onPointerDownOutside={(e) => { if (busy) e.preventDefault(); }}>
          <DialogHeader><DialogTitle>{edit?.id ? tr("Standard Item Edit", "معیاری چیز میں تبدیلی") : tr("New Standard Item", "نئی معیاری چیز")}</DialogTitle></DialogHeader>
          {edit && (
            <fieldset disabled={busy} className="min-w-0 space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5 overflow-x-auto">{(edit.images?.length ? edit.images : edit.image_url ? [edit.image_url] : []).map((u, n) => (
                  <div key={u} className="relative shrink-0"><img src={img(u, 160)} alt="" className="h-20 w-20 rounded-lg object-contain bg-muted" />
                    <button type="button" className="absolute -top-1 -left-1 rounded-full bg-destructive px-1.5 text-[10px] text-destructive-foreground" onClick={() => { const images = (edit.images?.length ? edit.images : (edit.image_url ? [edit.image_url] : [])).filter((_, k) => k !== n); setEdit({ ...edit, images, image_url: images[0] || null, image_verified: images.length ? edit.image_verified : false }); }}>×</button>
                    {n === 0 && <span className="absolute bottom-0 right-0 rounded bg-primary px-1 text-[9px] text-primary-foreground">{tr("Main", "مرکزی")}</span>}</div>))}
                  {!edit.images?.length && !edit.image_url && <div className="h-20 w-20 rounded-lg bg-muted" />}</div>
                <label className="flex cursor-pointer items-center gap-1 rounded-lg border px-3 py-2 text-xs"><ImagePlus className="h-4 w-4" /> {tr("Add original photo (up to 8)", "اصل تصویر شامل کریں (8 تک)")}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { e.target.files?.[0] && upload(e.target.files[0]); e.target.value = ""; }} /></label>
              </div>
              <label className="flex items-center gap-2 text-xs"><Switch checked={edit.image_verified} onCheckedChange={(c) => setEdit({ ...edit, image_verified: c })} /> {tr("I verified: photo is the actual packaging sold in Pakistan", "میں نے دیکھا ہے: تصویر پاکستان میں بکنے والی اصل پیکنگ ہے")}</label>
              <Input placeholder={tr("Name (English) e.g. Pepsi 1.5L", "نام (English) مثلاً Pepsi 1.5L")} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
              <Input placeholder={tr("Urdu name e.g. Pepsi 1.5 Litre", "اردو نام مثلاً پیپسی 1.5 لیٹر")} value={edit.name_ur || ""} onChange={(e) => setEdit({ ...edit, name_ur: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder={tr("Brand", "برانڈ")} value={edit.brand || ""} onChange={(e) => setEdit({ ...edit, brand: e.target.value })} />
                <Input placeholder={tr("Category", "قسم (Category)")} value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })} />
                <Input placeholder={tr("Size / Unit", "سائز / یونٹ")} value={edit.unit || ""} onChange={(e) => setEdit({ ...edit, unit: e.target.value })} />
                <Input aria-label={tr("Catalog barcode", "فہرست کا بارکوڈ")} placeholder={tr("Barcode (Optional)", "بارکوڈ (اختیاری)")} inputMode="numeric" dir="ltr" value={edit.barcode || ""} onChange={(e) => setEdit({ ...edit, barcode: e.target.value })} />
              </div>
              <input ref={scanRef} type="file" aria-label={tr("Catalog barcode photo", "فہرست کے بارکوڈ کی تصویر")} accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) scan(file); }} />
              <Button type="button" variant="outline" className="w-full" onClick={() => scanRef.current?.click()} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanBarcode className="h-4 w-4" />}{tr("Read barcode from photo", "تصویر سے بارکوڈ پڑھیں")}</Button>
              <Textarea placeholder={tr("Short description", "مختصر تفصیل")} value={edit.description || ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
              <p className="pt-1 text-xs font-semibold">{tr("Standard features", "معیاری خصوصیات")}</p>
              <div className="grid grid-cols-2 gap-2">
                {fields.map((f) => <Input key={f.key} placeholder={f.label} value={edit.specs?.[f.key] || ""} onChange={(e) => setEdit({ ...edit, specs: { ...edit.specs, [f.key]: e.target.value } })} />)}
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button className="flex-1" disabled={busy} onClick={() => save()}>{tr("Save", "محفوظ کریں")}</Button>
                {edit.id && nextReviewItem(matching, edit.id) && <Button variant="secondary" disabled={busy} onClick={() => save(true)}>{tr("Save & next", "محفوظ کریں اور اگلی چیز")}</Button>}
                {edit.id && <Button variant="outline" disabled={busy} aria-label={tr("Delete catalog item", "فہرست سے چیز حذف کریں")} onClick={remove}><Trash2 className="h-4 w-4" /></Button>}
              </div>
            </fieldset>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
