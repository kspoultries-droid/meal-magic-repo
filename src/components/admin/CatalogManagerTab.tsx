import { tr } from "@/lib/i18n/tr";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { img } from "@/lib/imageUrl";
import { matchesSearch } from "@/lib/searchMatch";
import { specTemplateFor } from "@/lib/catalogSpecs";
import { BadgeCheck, ImagePlus, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Item = { id?: string; name: string; name_ur: string | null; brand: string | null; category: string; unit: string | null; barcode: string | null; description: string | null; image_url: string | null; images: string[]; image_verified: boolean; specs: Record<string, string>; weight_kg: number | null };
const blank: Item = { name: "", name_ur: "", brand: "", category: "General", unit: "", barcode: "", description: "", image_url: null, images: [], image_verified: false, specs: {}, weight_kg: null };

export default function CatalogManagerTab() {
  const [items, setItems] = useState<Item[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "unverified" | "nophoto">("all");
  const [edit, setEdit] = useState<Item | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => (supabase as any).from("catalog_items").select("*").order("category").order("name").limit(5000).then(({ data }: any) => setItems(data || []));
  useEffect(() => { load(); }, []);

  const shown = useMemo(() => items.filter((i) =>
    (filter === "all" || (filter === "unverified" ? !i.image_verified : !i.image_url)) &&
    (!q || matchesSearch(q, i.name, i.name_ur, i.brand, i.category, i.barcode))).slice(0, 300), [items, q, filter]);
  const verified = items.filter((i) => i.image_verified && i.image_url).length;

  const upload = async (file: File) => {
    if (!edit) return;
    setBusy(true);
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `catalog/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type, upsert: false });
    setBusy(false);
    if (error) return toast.error(error.message);
    const url = supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
    const images = [...(edit.images?.length ? edit.images : edit.image_url ? [edit.image_url] : []), url].slice(0, 8);
    setEdit({ ...edit, images, image_url: images[0], image_verified: false });
  };

  const save = async () => {
    if (!edit || !edit.name.trim()) return toast.error(tr("Name is required", "نام لازمی ہے"));
    if (edit.image_verified && !edit.image_url) return toast.error(tr("Photo required for verification", "تصدیق کے لیے تصویر لازمی ہے"));
    setBusy(true);
    const { id, ...row } = edit;
    const images = row.images?.length ? row.images : row.image_url ? [row.image_url] : [];
    const payload = { ...row, images, image_url: images[0] || null, name: row.name.trim(), barcode: row.barcode?.trim() || null, updated_at: new Date().toISOString() };
    const { error } = id ? await (supabase as any).from("catalog_items").update(payload).eq("id", id) : await (supabase as any).from("catalog_items").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message.includes("barcode") ? tr("Barcode already exists", "یہ بارکوڈ پہلے سے موجود ہے") : error.message);
    toast.success(tr("Saved", "محفوظ ہو گیا"));
    setEdit(null); load();
  };

  const remove = async () => {
    if (!edit?.id || !confirm(tr("Delete this item from catalog? Existing store listings will not be removed.", "یہ چیز فہرست سے حذف کریں؟ دکانوں میں پہلے سے لگی چیزیں نہیں ہٹیں گی۔"))) return;
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
    <div className="space-y-3" dir="rtl">
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
      <div className="flex gap-1.5">
        {([["all", tr("All", "سب")], ["unverified", tr("Pending Verification", "تصدیق باقی")], ["nophoto", tr("No Image", "بغیر تصویر")]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className={`rounded-full border px-3 py-1 text-xs ${filter === k ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>{l}</button>
        ))}
      </div>
      <div className="divide-y rounded-xl border bg-card">
        {shown.map((i) => (
          <button key={i.id} onClick={() => setEdit({ ...blank, ...i, specs: i.specs || {}, images: i.images || [] })} className="flex w-full items-center gap-2 p-2 text-right">
            {i.image_url ? <img src={img(i.image_url, 80)} alt="" loading="lazy" className="h-10 w-10 rounded-md object-cover" /> : <div className="h-10 w-10 rounded-md bg-muted" />}
            <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{i.name}{i.name_ur ? ` · ${i.name_ur}` : ""}</p><p className="text-[10px] text-muted-foreground">{i.brand ? `${i.brand} · ` : ""}{i.category}{i.unit ? ` · ${i.unit}` : ""}</p></div>
            {i.image_verified && i.image_url ? <BadgeCheck className="h-4 w-4 text-primary" /> : <span className="text-[10px] text-muted-foreground">{tr("Pending Verification", "تصدیق باقی")}</span>}
          </button>
        ))}
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle>{edit?.id ? tr("Standard Item Edit", "معیاری چیز میں تبدیلی") : tr("New Standard Item", "نئی معیاری چیز")}</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5 overflow-x-auto">{(edit.images?.length ? edit.images : edit.image_url ? [edit.image_url] : []).map((u, n) => (
                  <div key={u} className="relative shrink-0"><img src={img(u, 160)} alt="" className="h-20 w-20 rounded-lg object-contain bg-muted" />
                    <button type="button" className="absolute -top-1 -left-1 rounded-full bg-destructive px-1.5 text-[10px] text-destructive-foreground" onClick={() => { const images = (edit.images?.length ? edit.images : [edit.image_url!]).filter((_, k) => k !== n); setEdit({ ...edit, images, image_url: images[0] || null, image_verified: images.length ? edit.image_verified : false }); }}>×</button>
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
                <Input placeholder={tr("Barcode (Optional)", "بارکوڈ (اختیاری)")} inputMode="numeric" value={edit.barcode || ""} onChange={(e) => setEdit({ ...edit, barcode: e.target.value })} />
              </div>
              <Textarea placeholder={tr("Short description", "مختصر تفصیل")} value={edit.description || ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
              <p className="pt-1 text-xs font-semibold">{tr("Standard features", "معیاری خصوصیات")}</p>
              <div className="grid grid-cols-2 gap-2">
                {fields.map((f) => <Input key={f.key} placeholder={f.label} value={edit.specs?.[f.key] || ""} onChange={(e) => setEdit({ ...edit, specs: { ...edit.specs, [f.key]: e.target.value } })} />)}
              </div>
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" disabled={busy} onClick={save}>{tr("Save", "محفوظ کریں")}</Button>
                {edit.id && <Button variant="outline" onClick={remove}><Trash2 className="h-4 w-4" /></Button>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
