import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fileToDataUrl, loadImage } from "@/lib/imageEnhance";
import { specsToText } from "@/lib/catalogSpecs";
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
  canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob: Blob = await new Promise((r) => canvas.toBlob((b) => r(b!), "image/jpeg", 0.85));
  return new File([blob], "product.jpg", { type: "image/jpeg" });
};

/** Reads a barcode from a photo using the device's built-in detector (Android Chrome / WebView). */
export const readBarcode = async (file: File): Promise<string | null> => {
  const Detector = (window as any).BarcodeDetector;
  if (!Detector) return null;
  try {
    const bitmap = await createImageBitmap(file);
    const codes = await new Detector().detect(bitmap);
    return codes?.[0]?.rawValue || null;
  } catch { return null; }
};

export const catalogToPatch = (c: any): QuickFillPatch => {
  const verifiedImages = c.image_verified ? (c.images?.length ? c.images : c.image_url ? [c.image_url] : []) : [];
  return {
    name: c.name, brand: c.brand || "", category: c.category, unit: c.unit || "", barcode: c.barcode || "",
    description: specsToText(c.category, c.specs, c.description), catalog_item_id: c.id, catalogImages: verifiedImages,
  };
};

export default function ProductQuickFill({ categories, onFill }: Props) {
  const [busy, setBusy] = useState<"" | "scan" | "ai">("");
  const [manual, setManual] = useState("");
  const [note, setNote] = useState("");
  const scanRef = useRef<HTMLInputElement>(null);
  const aiRef = useRef<HTMLInputElement>(null);

  const lookup = async (code: string) => {
    const clean = code.replace(/\D/g, "");
    if (clean.length < 6) { toast.error("بارکوڈ کم از کم 6 ہندسوں کا ہو"); return; }
    const { data } = await (supabase as any).from("catalog_items").select("*").eq("barcode", clean).maybeSingle();
    if (data) {
      onFill(catalogToPatch(data));
      setNote(`فہرست میں مل گیا: ${data.name}۔ صرف قیمت اور اسٹاک لکھیں۔`);
    } else {
      onFill({ barcode: clean });
      setNote("یہ بارکوڈ ابھی فہرست میں نہیں۔ نیچے «تصویر سے خود بھریں» استعمال کریں۔");
    }
  };

  const onScan = async (file?: File) => {
    if (!file) return;
    setBusy("scan");
    const code = await readBarcode(file);
    setBusy("");
    if (!code) { setNote("اس فون پر بارکوڈ خودکار نہیں پڑھا جا سکا۔ نمبر نیچے لکھ دیں۔"); return; }
    await lookup(code);
  };

  const onAi = async (file?: File) => {
    if (!file) return;
    setBusy("ai"); setNote("");
    try {
      const small = await shrink(file);
      const [imageDataUrl, code] = await Promise.all([fileToDataUrl(small), readBarcode(file)]);
      if (code) {
        const { data } = await (supabase as any).from("catalog_items").select("*").eq("barcode", code).maybeSingle();
        if (data) { onFill({ ...catalogToPatch(data), imageFiles: data.image_verified ? [] : [file] }); setNote(`فہرست میں مل گیا: ${data.name}`); return; }
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
        description: p.description, barcode: code || p.barcode?.replace(/\D/g, "") || undefined, extraSpecs,
        imageFiles: p.photo_ok ? [file] : [], catalog_item_id: null,
      });
      setNote(p.photo_ok
        ? `تفصیل بھر دی گئی۔ ایک بار پڑھ کر درست کر لیں، پھر قیمت اور اسٹاک لکھیں۔ (آج ${data.remaining} بار باقی)`
        : `تفصیل بھر دی گئی، مگر تصویر شامل نہیں کی: ${p.photo_issue || "تصویر صاف نہیں"}۔ اصل چیز کی صاف تصویر الگ سے لگائیں۔`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "کچھ غلط ہو گیا");
    } finally { setBusy(""); }
  };

  return (
    <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
      <p className="text-xs font-bold">جلدی شامل کریں — کچھ لکھنا نہیں پڑے گا</p>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" className="h-auto flex-col gap-1 py-2 text-xs" disabled={!!busy} onClick={() => scanRef.current?.click()}>
          {busy === "scan" ? <Loader2 className="h-5 w-5 animate-spin" /> : <ScanBarcode className="h-5 w-5" />} بارکوڈ اسکین
        </Button>
        <Button type="button" className="h-auto flex-col gap-1 py-2 text-xs" disabled={!!busy} onClick={() => aiRef.current?.click()}>
          {busy === "ai" ? <Loader2 className="h-5 w-5 animate-spin" /> : <span className="flex gap-1"><Camera className="h-5 w-5" /><Sparkles className="h-4 w-4" /></span>} تصویر سے خود بھریں
        </Button>
      </div>
      <input ref={scanRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { onScan(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={aiRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { onAi(e.target.files?.[0]); e.target.value = ""; }} />
      <div className="flex gap-2">
        <Input inputMode="numeric" placeholder="یا بارکوڈ نمبر لکھیں" className="h-8 text-xs" value={manual} onChange={(e) => setManual(e.target.value)} />
        <Button type="button" size="sm" variant="secondary" className="h-8" onClick={() => lookup(manual)}>تلاش</Button>
      </div>
      <p className="text-[10px] text-muted-foreground">تصویر کھینچتے وقت: چیز سامنے رکھیں، نام اور سائز والا حصہ صاف دکھے، روشنی میں اور سادہ پس منظر پر۔</p>
      {note && <p className="rounded-md bg-card px-2 py-1.5 text-[11px] font-medium text-primary">{note}</p>}
    </div>
  );
}
