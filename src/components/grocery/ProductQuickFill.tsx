import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { copyFile, fileToDataUrl, loadImage } from "@/lib/imageEnhance";
import { specsToText } from "@/lib/catalogSpecs";
import { catalogImages, validBarcode } from "@/lib/catalogOnboarding";
import { readBarcode } from "@/lib/barcodeReader";
export { readBarcode } from "@/lib/barcodeReader";
import { tr } from "@/lib/i18n/tr";
import { Camera, Loader2, ScanBarcode, Sparkles } from "lucide-react";
import { toast } from "sonner";

export type QuickFillPatch = {
  name?: string; brand?: string; category?: string; unit?: string; description?: string;
  barcode?: string; catalog_item_id?: string | null; catalogImages?: string[]; imageFiles?: File[];
  extraSpecs?: Record<string, string>;
};

type Props = { categories: string[]; onFill: (patch: QuickFillPatch) => void };

const shrink = async (file: File, max = 1280): Promise<File> => {
  const image = await loadImage(file);
  const scale = Math.min(1, max / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error(tr("Image could not be read", "تصویر نہیں پڑھی جا سکی"));
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => b ? resolve(b) : reject(new Error("Image encoding failed")), "image/jpeg", 0.85));
  return new File([blob], "product.jpg", { type: "image/jpeg" });
};

export const catalogToPatch = (c: any): QuickFillPatch => {
  const verifiedImages = catalogImages(c);
  return {
    name: c.name, brand: c.brand || "", category: c.category, unit: c.unit || "", barcode: c.barcode || "",
    description: specsToText(c.category, c.specs, c.description), catalog_item_id: c.id, catalogImages: verifiedImages,
  };
};

export default function ProductQuickFill({ categories, onFill }: Props) {
  const [busy, setBusy] = useState<"" | "scan" | "ai">("");
  const [manual, setManual] = useState("");
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const lock = useRef(false);
  const scanRef = useRef<HTMLInputElement>(null);
  const aiRef = useRef<HTMLInputElement>(null);

  const lookup = async (code: string) => {
    const clean = code.trim();
    if (!validBarcode(clean)) throw new Error(tr("Check the barcode digits and checksum", "بارکوڈ کے ہندسے درست کریں"));
    const { data, error } = await (supabase as any).from("catalog_items").select("*").eq("barcode", clean).maybeSingle();
    if (error) throw error;
    if (data) {
      onFill(catalogToPatch(data));
      setNote(tr(`Found: ${data.name}. Enter your price and stock.`, `فہرست میں مل گیا: ${data.name}۔ اپنی قیمت اور اسٹاک لکھیں۔`));
    } else {
      onFill({ barcode: clean, catalog_item_id: null, catalogImages: [] });
      setNote(tr("Barcode not in catalog. Search by name or use a photo.", "یہ بارکوڈ فہرست میں نہیں؛ نام سے تلاش کریں یا تصویر استعمال کریں۔"));
    }
  };

  const runLookup = async (file?: File) => {
    if (lock.current) return;
    lock.current = true; setBusy("scan"); setNote("");
    try {
      const code = file ? await readBarcode(file) : manual;
      if (!code) throw new Error(tr("Barcode could not be read. Enter its number.", "بارکوڈ نہیں پڑھا جا سکا؛ اس کا نمبر لکھیں۔"));
      await lookup(code);
    } catch (error) { toast.error(error instanceof Error ? error.message : tr("Lookup failed. Try again.", "تلاش ناکام ہوئی؛ دوبارہ کوشش کریں۔")); }
    finally { lock.current = false; setBusy(""); }
  };

  const searchCatalog = async () => {
    if (lock.current || search.trim().length < 2) return;
    lock.current = true; setBusy("scan");
    try {
      const query = search.trim().replace(/[%,_()."'\\]/g, " ");
      const { data, error } = await (supabase as any).from("catalog_items").select("*").or(`name.ilike.%${query}%,name_ur.ilike.%${query}%,brand.ilike.%${query}%`).order("name").limit(20);
      if (error) throw error;
      setResults(data || []);
      setNote(data?.length ? "" : tr("No matching items", "کوئی متعلقہ چیز نہیں ملی"));
    } catch { toast.error(tr("Catalog could not be loaded", "فہرست نہیں آ سکی")); }
    finally { lock.current = false; setBusy(""); }
  };

  const onAi = async (files: File[]) => {
    if (!files[0] || lock.current) return;
    lock.current = true; setBusy("ai"); setNote("");
    try {
      files = await Promise.all(files.slice(0, 8).map(copyFile));
      const file = files[0];
      const small = await shrink(file);
      const [imageDataUrl, code] = await Promise.all([fileToDataUrl(small), readBarcode(file)]);
      if (code) {
        const { data, error: lookupError } = await (supabase as any).from("catalog_items").select("*").eq("barcode", code).maybeSingle();
        if (lookupError) throw lookupError;
        if (data) { onFill({ ...catalogToPatch(data), imageFiles: data.image_verified ? [] : files.slice(0, 8) }); setNote(`فہرست میں مل گیا: ${data.name}`); return; }
      }
      const { data, error } = await supabase.functions.invoke("ai-setup-assistant", { body: { kind: "product", imageDataUrl, categories } });
      if (error) {
        const body = error instanceof FunctionsHttpError ? await error.context.json().catch(() => null) : null;
        throw new Error(body?.error || "AI ابھی دستیاب نہیں");
      }
      const p = data?.product;
      if (!p) throw new Error("تصویر سے معلومات نہیں ملیں");
      const extraSpecs = Object.fromEntries((p.specs || []).filter((s: any) => s.label && s.value).map((s: any) => [s.label, s.value]));
      onFill({
        name: p.name, brand: p.brand, category: categories.includes(p.category) ? p.category : undefined, unit: p.unit,
        description: p.description, barcode: code || (p.barcode && validBarcode(p.barcode) ? p.barcode : undefined), extraSpecs,
        imageFiles: p.photo_ok ? files.slice(0, 8) : files.slice(1, 8), catalog_item_id: null,
      });
      setNote(p.photo_ok
        ? `تفصیل بھر دی گئی۔ ایک بار پڑھ کر درست کر لیں، پھر قیمت اور اسٹاک لکھیں۔ (آج ${data.remaining} بار باقی)`
        : `تفصیل بھر دی گئی، مگر تصویر شامل نہیں کی: ${p.photo_issue || "تصویر صاف نہیں"}۔ اصل چیز کی صاف تصویر الگ سے لگائیں۔`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "کچھ غلط ہو گیا");
    } finally { lock.current = false; setBusy(""); }
  };

  return (
    <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
      <p className="text-xs font-bold">{tr("Find an item", "چیز تلاش کریں")}</p>
      <div className="flex gap-2"><Input aria-label={tr("Catalog name search", "فہرست میں نام سے تلاش")} placeholder={tr("Product name", "چیز کا نام")} value={search} onChange={(e) => setSearch(e.target.value)} /><Button type="button" variant="outline" disabled={!!busy || search.trim().length < 2} onClick={searchCatalog}>{tr("Search", "تلاش")}</Button></div>
      {results.length > 0 && <div className="max-h-48 overflow-y-auto divide-y">{results.map((item) => <Button key={item.id} type="button" variant="ghost" disabled={!!busy} className="h-auto w-full justify-start whitespace-normal py-2 text-start text-xs" onClick={() => { onFill(catalogToPatch(item)); setResults([]); setNote(tr("Enter your price and stock", "اپنی قیمت اور اسٹاک لکھیں")); }}>{item.name} · {item.unit}</Button>)}</div>}
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" className="h-auto flex-col gap-1 py-2 text-xs" disabled={!!busy} onClick={() => scanRef.current?.click()}>
          {busy === "scan" ? <Loader2 className="h-5 w-5 animate-spin" /> : <ScanBarcode className="h-5 w-5" />} {tr("Scan barcode", "بارکوڈ اسکین")}
        </Button>
        <Button type="button" className="h-auto flex-col gap-1 py-2 text-xs" disabled={!!busy} onClick={() => aiRef.current?.click()}>
          {busy === "ai" ? <Loader2 className="h-5 w-5 animate-spin" /> : <span className="flex gap-1"><Camera className="h-5 w-5" /><Sparkles className="h-4 w-4" /></span>} {tr("Fill from photo", "تصویر سے خود بھریں")}
        </Button>
      </div>
      <input ref={scanRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={(e) => { if (e.target.files?.[0]) runLookup(e.target.files[0]); e.target.value = ""; }} />
      <input ref={aiRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => { onAi(Array.from(e.target.files || [])); e.target.value = ""; }} />
      <div className="flex gap-2">
        <Input inputMode="numeric" placeholder={tr("Or enter barcode", "یا بارکوڈ نمبر لکھیں")} aria-label={tr("Barcode number", "بارکوڈ نمبر")} className="h-8 text-xs" value={manual} onChange={(e) => setManual(e.target.value)} />
        <Button type="button" size="sm" variant="secondary" className="h-8" disabled={!!busy} onClick={() => runLookup()}>{tr("Search", "تلاش")}</Button>
      </div>
      <p className="text-[10px] text-muted-foreground">{tr("One clear front photo is enough; extra angles are optional (up to 8).", "سامنے سے 1 صاف تصویر کافی ہے؛ مزید زاویے اختیاری ہیں (8 تک)۔")}</p>
      {note && <p className="rounded-md bg-card px-2 py-1.5 text-[11px] font-medium text-primary">{note}</p>}
    </div>
  );
}
