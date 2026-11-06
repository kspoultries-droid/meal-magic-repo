import { tr } from "@/lib/i18n/tr";
import { useState, ReactNode } from "react";
import { Camera, ImagePlus, Loader2, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PhotoTips from "@/components/media/PhotoTips";
import { PhotoAspect, PhotoCheck, dataUrlToFile, enhancePhoto, fileToDataUrl, prepareOriginalPhoto } from "@/lib/imageEnhance";

export type PreparedPhoto = { file: File; original: File };

type Item = {
  id: string;
  original: File;
  originalUrl: string;
  enhanced: File;
  enhancedUrl: string;
  check: PhotoCheck;
  useOriginal: boolean;
  cleaning: boolean;
};

interface Props {
  onDone: (photos: PreparedPhoto[]) => Promise<void> | void;
  aspect?: PhotoAspect;
  multiple?: boolean;
  compact?: boolean;
  label?: string;
  children?: ReactNode;
}

const ProductPhotoUploader = ({ onDone, aspect = "square", multiple = false, compact = false, label = tr("Add photo", "تصویر شامل کریں") }: Props) => {
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleFiles = async (files: File[]) => {
    if (!files.length) return;
    setBusy(true);
    try {
      const prepared: Item[] = [];
      for (const picked of files.slice(0, multiple ? 8 : 1)) {
        // Android WebView camera/gallery files can often be read only once.
        // Copy the bytes into memory first, then prepare both versions up front.
        const bytes = await picked.arrayBuffer();
        const file = new File([bytes], picked.name || "photo.jpg", { type: picked.type || "image/jpeg" });
        const { file: enhanced, url, check } = await enhancePhoto(file, aspect);
        const original = await prepareOriginalPhoto(file);
        prepared.push({
          id: `${file.name}-${Math.random().toString(36).slice(2)}`,
          original,
          originalUrl: URL.createObjectURL(original),
          enhanced,
          enhancedUrl: url,
          check,
          useOriginal: false,
          cleaning: false,
        });
      }
      setItems(prepared);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tr("Couldn't read image", "تصویر پڑھی نہیں جا سکی"));
    } finally {
      setBusy(false);
    }
  };

  const cleanBackground = async (item: Item) => {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, cleaning: true } : i)));
    try {
      const imageDataUrl = await fileToDataUrl(item.enhanced);
      const { data, error } = await supabase.functions.invoke("enhance-product-image", { body: { imageDataUrl } });
      const message = (data as any)?.error || error?.message;
      if (!data || (data as any)?.error || error) throw new Error(message || tr("Couldn't remove background", "پس منظر صاف نہیں ہو سکا"));
      const cleaned = await dataUrlToFile((data as any).image, `${item.original.name.replace(/\.[^.]+$/, "")}-studio.png`);
      const { file: finalFile, url } = await enhancePhoto(cleaned, aspect);
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, enhanced: finalFile, enhancedUrl: url, useOriginal: false, cleaning: false } : i)),
      );
      toast.success(tr("Background removed", "پس منظر صاف ہو گیا"));
    } catch (error) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, cleaning: false } : i)));
      toast.error(error instanceof Error ? error.message : tr("Couldn't remove background", "پس منظر صاف نہیں ہو سکا"));
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const photos = await Promise.all(items.map(async i => ({ file: i.useOriginal ? i.original : i.enhanced, original: i.original })));
      await onDone(photos);
      setItems([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tr("Couldn't save", "محفوظ نہیں ہو سکا"));
    } finally {
      setSaving(false);
    }
  };

  const pick = (capture: boolean) => (
    <label
      className={
        compact
          ? "flex size-7 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md"
          : "flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold text-foreground shadow-sm"
      }
      title={capture ? tr("Camera", "کیمرہ") : tr("Gallery", "گیلری")}
    >
      {capture ? <Camera className="size-3.5" /> : <ImagePlus className="size-3.5" />}
      {!compact && <span>{capture ? tr("Take photo", "کیمرہ سے تصویر") : label}</span>}
      <input
        type="file"
        accept="image/*"
        multiple={multiple && !capture}
        {...(capture ? { capture: "environment" as const } : {})}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          e.target.value = "";
          handleFiles(files);
        }}
      />
    </label>
  );

  return (
    <>
      <div className={compact ? "flex gap-1" : "flex flex-wrap gap-2"}>
        {pick(true)}
        {pick(false)}
        {busy && <Loader2 className="size-4 animate-spin text-primary" />}
      </div>

      <Dialog open={items.length > 0} onOpenChange={(open) => !open && setItems([])}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4 text-primary" /> {tr("Enhance photo / Photo studio", "تصویر بہتر کریں / Photo studio")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-[11px] text-muted-foreground">
              {tr("Your original photo remains — only lighting, color, crop, and clarity have been enhanced.", "آپ کی اصل تصویر ہی رہے گی — صرف روشنی، رنگ، کٹائی اور صفائی بہتر کی گئی ہے۔")}
            </p>

            {items.map((item) => (
              <div key={item.id} className="space-y-2 rounded-xl border border-border/70 bg-card p-3">
                <div className="grid grid-cols-2 gap-2">
                  <figure className="space-y-1">
                    <img src={item.originalUrl} alt={tr("Original photo", "اصل تصویر")} onClick={() => setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, useOriginal: true } : i)))} className={`aspect-square w-full cursor-pointer rounded-lg object-cover ${item.useOriginal ? "ring-2 ring-primary" : ""}`} />
                    <figcaption className={`text-center text-[10px] font-semibold ${item.useOriginal ? "text-primary" : "text-muted-foreground"}`}>{tr("Before", "پہلے / Before")}</figcaption>
                  </figure>
                  <figure className="space-y-1">
                    <img src={item.enhancedUrl} alt={tr("Enhanced photo", "بہتر تصویر")} onClick={() => setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, useOriginal: false } : i)))} className={`aspect-square w-full cursor-pointer rounded-lg object-cover ${item.useOriginal ? "" : "ring-2 ring-primary"}`} />
                    <figcaption className={`text-center text-[10px] font-semibold ${item.useOriginal ? "text-muted-foreground" : "text-primary"}`}>{tr("After", "بعد میں / After")}</figcaption>
                  </figure>
                </div>

                {item.check.issues.length > 0 && (
                  <ul className="space-y-1 rounded-lg bg-destructive/10 p-2">
                    {item.check.issues.map((issue) => (
                      <li key={issue.code} className="text-[11px] font-semibold text-destructive">
                        • {issue.message}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" size="sm" variant="secondary" className="h-8 gap-1 text-[11px]" disabled={item.cleaning} onClick={() => cleanBackground(item)}>
                    {item.cleaning ? <Loader2 className="size-3.5 animate-spin" /> : <Wand2 className="size-3.5" />}
                    {tr("Remove background", "پس منظر صاف کریں")}
                  </Button>
                  <label className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={item.useOriginal}
                      onChange={(e) => setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, useOriginal: e.target.checked } : i)))}
                    />
                    {tr("Keep original photo", "اصل تصویر ہی رکھیں")}
                  </label>
                </div>
              </div>
            ))}

            <PhotoTips />

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setItems([])} disabled={saving}>
                {tr("Cancelled", "منسوخ")}
              </Button>
              <Button type="button" className="flex-1 gap-1" onClick={save} disabled={saving}>
                {saving && <Loader2 className="size-4 animate-spin" />} {tr("Save", "محفوظ کریں")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProductPhotoUploader;
