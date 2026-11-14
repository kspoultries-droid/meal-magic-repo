import { useState } from "react";
import { Plus, Trash2, Shirt, Loader2, ImagePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { uploadGroceryProductPhoto } from "@/lib/groceryProductImages";
import { buildMatrixVariants, readMatrix, SIZE_PRESETS, type MatrixDesign, type MatrixSize } from "@/lib/variantMatrix";
import { toast } from "sonner";

const PIECES = ["1-Piece", "2-Piece", "3-Piece"];

export default function VariantMatrixEditor({ product, onSaved }: { product: any; onSaved: () => void }) {
  const { lang } = useLanguage();
  const L = (en: string, ur: string) => (lang === "ur" ? ur : en);
  const basePrice = Number(product.wholesale_price ?? product.discount_price ?? product.price ?? 0);
  const init = readMatrix(product.variants);
  const specs = (product.specs && typeof product.specs === "object" ? product.specs : {}) as Record<string, string>;
  const [open, setOpen] = useState(false);
  const [designs, setDesigns] = useState<MatrixDesign[]>(init.designs.length ? init.designs : [{ name: "", price: basePrice }]);
  const [sizes, setSizes] = useState<MatrixSize[]>(init.sizes);
  const [piece, setPiece] = useState(specs["سوٹ کی قسم"] || "");
  const [fabric, setFabric] = useState(specs["کپڑا / میٹریل"] || "");
  const [busy, setBusy] = useState<string | null>(null);

  const setD = (i: number, patch: Partial<MatrixDesign>) => setDesigns((all) => all.map((d, k) => (k === i ? { ...d, ...patch } : d)));
  const setS = (i: number, patch: Partial<MatrixSize>) => setSizes((all) => all.map((s, k) => (k === i ? { ...s, ...patch } : s)));
  const addPreset = (key: string) => {
    const p = SIZE_PRESETS.find((x) => x.key === key); if (!p) return;
    setSizes((all) => [...all, ...p.sizes.filter((s) => !all.some((a) => a.label === s.label))]);
  };

  const uploadDesignPhoto = async (i: number, file?: File) => {
    if (!file) return;
    setBusy(`img${i}`);
    try { setD(i, { image: await uploadGroceryProductPhoto(product.id, file) }); }
    catch (e) { toast.error(L("Photo not saved", "تصویر محفوظ نہیں ہوئی")); }
    finally { setBusy(null); }
  };

  const save = async () => {
    const valid = designs.filter((d) => d.name.trim() && Number(d.price) > 0);
    if (!valid.length) { toast.error(L("Add at least one design with name and price", "کم از کم ایک ڈیزائن نام اور قیمت کے ساتھ لکھیں")); return; }
    const variants = buildMatrixVariants(valid, sizes, basePrice);
    if (variants.some((v) => basePrice + v.price_delta <= 0)) { toast.error(L("A price is zero or less", "کوئی قیمت صفر یا کم ہے")); return; }
    const nextSpecs: Record<string, string> = { ...specs };
    if (piece) nextSpecs["سوٹ کی قسم"] = piece; else delete nextSpecs["سوٹ کی قسم"];
    if (fabric.trim()) nextSpecs["کپڑا / میٹریل"] = fabric.trim(); else delete nextSpecs["کپڑا / میٹریل"];
    const photos = valid.map((d) => d.image).filter(Boolean) as string[];
    const images = Array.from(new Set([...(Array.isArray(product.images) ? product.images : []), ...photos]));
    setBusy("save");
    const { error } = await supabase.from("grocery_products").update({
      variants: variants as any, specs: nextSpecs as any, images,
      ...(product.image_url ? {} : photos[0] ? { image_url: photos[0] } : {}),
    }).eq("id", product.id).select("id").single();
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success(L(`${variants.length} options saved`, `${variants.length} آپشن محفوظ ہو گئے`));
    setOpen(false); onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 w-full text-xs"><Shirt className="me-1 h-3 w-3" />{L("Designs, colours & sizes", "ڈیزائن، رنگ اور سائز")}</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle className="text-base">{product.name}</DialogTitle></DialogHeader>

        <section className="space-y-2">
          <p className="text-sm font-extrabold">1. {L("Designs / colours (each with own photo & price)", "ڈیزائن / رنگ (ہر ایک کی اپنی تصویر اور قیمت)")}</p>
          {designs.map((d, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl border border-border p-2">
              <label className="relative flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-muted">
                {busy === `img${i}` ? <Loader2 className="h-4 w-4 animate-spin" /> : d.image ? <img src={d.image} alt={d.name} className="h-full w-full object-contain" /> : <ImagePlus className="h-5 w-5 text-muted-foreground" />}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadDesignPhoto(i, e.target.files?.[0])} />
              </label>
              <div className="grid flex-1 gap-1">
                <Input value={d.name} onChange={(e) => setD(i, { name: e.target.value })} placeholder={L("e.g. Maroon / Rose Gold", "مثلاً Maroon / Rose Gold")} className="h-8 text-xs" />
                <Input type="number" inputMode="numeric" value={d.price || ""} onChange={(e) => setD(i, { price: Number(e.target.value) })} placeholder={L("Price Rs", "قیمت روپے")} className="h-8 text-xs" />
              </div>
              <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={L("Remove", "ہٹائیں")} onClick={() => setDesigns((all) => all.filter((_, k) => k !== i))}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <Button size="sm" variant="outline" className="w-full" onClick={() => setDesigns((all) => [...all, { name: "", price: basePrice }])}><Plus className="me-1 h-4 w-4" />{L("Add design", "ڈیزائن شامل کریں")}</Button>
        </section>

        <section className="space-y-2">
          <p className="text-sm font-extrabold">2. {L("Sizes (tap a ready list, remove what you don't have)", "سائز (تیار فہرست دبائیں، جو نہیں ہیں ہٹا دیں)")}</p>
          <div className="flex flex-wrap gap-1.5">
            {SIZE_PRESETS.map((p) => <button key={p.key} type="button" onClick={() => addPreset(p.key)} className="rounded-full border border-primary/40 bg-accent px-3 py-1 text-[11px] font-bold text-accent-foreground">+ {L(p.en, p.ur)}</button>)}
          </div>
          {sizes.length > 0 && <p className="text-[11px] text-muted-foreground">{L("Extra Rs = added to design price for this size (0 if same).", "اضافی روپے = اس سائز پر ڈیزائن کی قیمت میں اضافہ (برابر ہو تو 0)۔")}</p>}
          {sizes.map((s, i) => (
            <div key={i} className="grid grid-cols-[1fr_1.4fr_80px_32px] items-center gap-1.5">
              <Input value={s.label} onChange={(e) => setS(i, { label: e.target.value })} className="h-8 text-xs" placeholder={L("Size", "سائز")} />
              <Input value={s.note || ""} onChange={(e) => setS(i, { note: e.target.value })} className="h-8 text-xs" placeholder={L("Length / chest / cm", "لمبائی / چھاتی / cm")} />
              <Input type="number" inputMode="numeric" value={s.extra || ""} onChange={(e) => setS(i, { extra: Number(e.target.value) })} className="h-8 text-xs" placeholder="+Rs" />
              <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={L("Remove", "ہٹائیں")} onClick={() => setSizes((all) => all.filter((_, k) => k !== i))}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          ))}
          <Button size="sm" variant="ghost" className="w-full" onClick={() => setSizes((all) => [...all, { label: "", extra: 0 }])}><Plus className="me-1 h-4 w-4" />{L("Own size", "اپنا سائز")}</Button>
        </section>

        <section className="space-y-2">
          <p className="text-sm font-extrabold">3. {L("Suit type & fabric (clothes)", "سوٹ کی قسم اور کپڑا (کپڑوں کے لیے)")}</p>
          <div className="flex gap-1.5">
            {PIECES.map((p) => <button key={p} type="button" onClick={() => setPiece(piece === p ? "" : p)} className={`flex-1 rounded-lg border-2 py-1.5 text-xs font-bold ${piece === p ? "border-primary bg-accent" : "border-border"}`}>{p}</button>)}
          </div>
          <Input value={fabric} onChange={(e) => setFabric(e.target.value)} placeholder={L("Fabric: cotton, lawn, khaddar, silk…", "کپڑا: کاٹن، لان، کھدر، سلک…")} className="h-8 text-xs" />
        </section>

        <Button className="w-full" disabled={busy === "save"} onClick={save}>{busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : L("Save all options", "سب آپشن محفوظ کریں")}</Button>
      </DialogContent>
    </Dialog>
  );
}
