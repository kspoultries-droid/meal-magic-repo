import { tr } from "@/lib/i18n/tr";
import { useEffect, useRef, useState, ReactNode } from "react";
import { Capacitor } from "@capacitor/core";
import { Camera as NativeCamera, CameraResultType, CameraSource } from "@capacitor/camera";
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
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const preparing = useRef(false);
  const saveLock = useRef(false);
  const objectUrls = useRef<string[]>([]);
  const blocked = busy || saving || items.some(item => item.cleaning);

  useEffect(() => {
    if (!cameraOpen) return;
    let cancelled = false;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false }).then(async media => {
      if (cancelled) { media.getTracks().forEach(track => track.stop()); return; }
      stream.current = media;
      if (video.current) { video.current.srcObject = media; await video.current.play(); }
      if (!cancelled) setCameraReady(true);
    }).catch(() => {
      if (!cancelled) { toast.error(tr("Camera could not open — check camera permission", "کیمرہ نہیں کھل سکا — کیمرہ کی اجازت چیک کریں")); setCameraOpen(false); }
    });
    return () => { cancelled = true; stream.current?.getTracks().forEach(track => track.stop()); stream.current = null; setCameraReady(false); };
  }, [cameraOpen]);

  useEffect(() => () => { objectUrls.current.forEach(url => URL.revokeObjectURL(url)); }, []);

  const handleFiles = async (files: File[]) => {
    if (!files.length || preparing.current || saveLock.current) return;
    preparing.current = true;
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
        const originalUrl = URL.createObjectURL(original);
        objectUrls.current.push(originalUrl, url);
        prepared.push({
          id: `${file.name}-${Math.random().toString(36).slice(2)}`,
          original,
          originalUrl,
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
      preparing.current = false;
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
      objectUrls.current.push(url);
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
    if (saveLock.current || preparing.current || !items.length || items.some(item => item.cleaning)) return;
    saveLock.current = true;
    setSaving(true);
    try {
      const photos = await Promise.all(items.map(async i => ({ file: i.useOriginal ? i.original : i.enhanced, original: i.original })));
      await onDone(photos);
      setItems([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tr("Couldn't save", "محفوظ نہیں ہو سکا"));
    } finally {
      setSaving(false);
      saveLock.current = false;
    }
  };

  const openCamera = async () => {
    if (blocked || preparing.current) return;
    if (Capacitor.isNativePlatform()) {
      preparing.current = true; setBusy(true);
      try {
        const photo = await NativeCamera.getPhoto({ source: CameraSource.Camera, resultType: CameraResultType.Uri, quality: 90, width: 1600, correctOrientation: true });
        if (!photo.webPath) throw new Error(tr("No camera photo returned", "کیمرہ کی تصویر نہیں ملی"));
        const response = await fetch(photo.webPath);
        const blob = await response.blob();
        preparing.current = false;
        await handleFiles([new File([blob], `camera.${photo.format}`, { type: blob.type || "image/jpeg" })]);
      } catch (error) {
        if (!(error instanceof Error && /cancel/i.test(error.message))) toast.error(tr("Camera could not open — check camera permission", "کیمرہ نہیں کھل سکا — کیمرہ کی اجازت چیک کریں"));
      } finally { preparing.current = false; setBusy(false); }
    } else if (navigator.mediaDevices?.getUserMedia) setCameraOpen(true);
    else toast.error(tr("Camera is unavailable on this device", "اس ڈیوائس پر کیمرہ دستیاب نہیں"));
  };
  const capture = async () => {
    const source = video.current;
    if (!source || !source.videoWidth || !cameraReady || preparing.current) return;
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1600 / Math.max(source.videoWidth, source.videoHeight));
    canvas.width = Math.round(source.videoWidth * scale); canvas.height = Math.round(source.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) { toast.error(tr("Could not capture photo", "تصویر نہیں لی جا سکی")); return; }
    setCameraOpen(false);
    await handleFiles([new File([blob], "camera.jpg", { type: "image/jpeg" })]);
  };

  return (
    <>
      <div className={compact ? "flex gap-1" : "flex flex-wrap gap-2"}>
        <Button type="button" variant="outline" size={compact ? "icon" : "sm"} disabled={blocked} aria-label={tr("Take photo", "کیمرہ سے تصویر")} title={tr("Camera", "کیمرہ")} onClick={() => void openCamera()}><Camera className="size-3.5" />{!compact && tr("Take photo", "کیمرہ سے تصویر")}</Button>
        <Button type="button" variant="outline" size={compact ? "icon" : "sm"} disabled={blocked} title={tr("Gallery", "گیلری")} aria-label={label} onClick={() => gallery.current?.click()}><ImagePlus className="size-3.5" />{!compact && label}</Button>
        <input ref={gallery} type="file" aria-label={tr("Gallery photo", "گیلری کی تصویر")} accept="image/*" multiple={multiple} className="hidden" disabled={blocked} onChange={e => { const files = Array.from(e.target.files || []); e.target.value = ""; void handleFiles(files); }} />
        {busy && <Loader2 className="size-4 animate-spin text-primary" />}
      </div>

      <Dialog open={cameraOpen} onOpenChange={setCameraOpen}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{tr("Camera", "کیمرہ")}</DialogTitle></DialogHeader><video ref={video} autoPlay playsInline muted className="aspect-[4/3] w-full rounded-md bg-muted object-cover" /><Button disabled={!cameraReady || busy} onClick={() => void capture()}><Camera className="size-4" />{tr("Capture photo", "تصویر کھینچیں")}</Button></DialogContent></Dialog>
      <Dialog open={items.length > 0} onOpenChange={(open) => { if (!open && !saveLock.current && !items.some(item => item.cleaning)) setItems([]); }}>
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
                  <Button type="button" size="sm" variant="secondary" className="h-8 gap-1 text-[11px]" disabled={item.cleaning || saving} onClick={() => cleanBackground(item)}>
                    {item.cleaning ? <Loader2 className="size-3.5 animate-spin" /> : <Wand2 className="size-3.5" />}
                    {tr("Remove background", "پس منظر صاف کریں")}
                  </Button>
                  <label className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={item.useOriginal}
                      disabled={saving || item.cleaning}
                      onChange={(e) => setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, useOriginal: e.target.checked } : i)))}
                    />
                    {tr("Keep original photo", "اصل تصویر ہی رکھیں")}
                  </label>
                </div>
              </div>
            ))}

            <PhotoTips />

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setItems([])} disabled={blocked}>
                {tr("Cancelled", "منسوخ")}
              </Button>
              <Button type="button" className="flex-1 gap-1" onClick={save} disabled={blocked}>
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
