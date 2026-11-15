import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImageIcon, Check } from "lucide-react";
import ProductPhotoUploader from "@/components/media/ProductPhotoUploader";
import { tr } from "@/lib/i18n/tr";
import { bannerOptionsFor, type BannerVertical } from "@/lib/bannerLibrary";

interface Props {
  vertical: BannerVertical;
  category?: string | null;
  hasBanner: boolean;
  /** Folder prefix inside product-images; file name is the owner's record id. */
  folder: string;
  recordId: string;
  onSave: (publicUrl: string) => Promise<void>;
}

/** Banner is permanent branding: chosen once from a category library or the shop's own photo; changes need explicit confirmation. */
export default function BannerPicker({ vertical, category, hasBanner, folder, recordId, onSave }: Props) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const options = bannerOptionsFor(vertical, category);

  const start = () => {
    if (hasBanner && !confirm(tr("Your banner is your shop's identity for customers. Change it anyway?", "بینر گاہکوں کے لیے آپ کی دکان کی پہچان ہے۔ کیا واقعی تبدیل کرنا چاہتے ہیں؟"))) return;
    setPicked(null); setOpen(true);
  };

  const store = async (blob: Blob) => {
    const path = `${folder}/${crypto.randomUUID()}/${recordId}.jpg`;
    const { error } = await supabase.storage.from("product-images").upload(path, blob, { upsert: false, contentType: blob.type || "image/jpeg" });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    await onSave(data.publicUrl);
    toast.success(tr("Banner saved", "بینر محفوظ ہو گیا"));
    setOpen(false);
  };

  const savePicked = async () => {
    if (!picked) return;
    setSaving(true);
    try { const blob = await (await fetch(picked)).blob(); await store(blob); }
    catch (e: any) { toast.error(e?.message || tr("Could not save", "محفوظ نہیں ہو سکا")); }
    finally { setSaving(false); }
  };

  return (
    <>
      <Button type="button" size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={start}>
        <ImageIcon className="size-3.5" /> {hasBanner ? tr("Banner settings", "بینر کی ترتیب") : tr("Choose banner", "بینر منتخب کریں")}
      </Button>
      <Dialog open={open} onOpenChange={(o) => { if (!saving) setOpen(o); }}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{tr("Choose your banner (once)", "اپنا بینر منتخب کریں (ایک بار)")}</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">{tr("Pick one ready photo for your category, or upload a real photo of your shop.", "اپنی کیٹیگری کی تیار تصویر چنیں یا اپنی دکان کی اصل تصویر لگائیں۔")}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {options.map(o => (
              <button key={o.id} type="button" onClick={() => setPicked(o.src)} className={`relative overflow-hidden rounded-lg border-2 ${picked === o.src ? "border-primary" : "border-transparent"}`}>
                <img src={o.src} alt="" loading="lazy" className="aspect-[2/1] w-full object-cover" />
                {picked === o.src && <span className="absolute right-1 top-1 rounded-full bg-primary p-1 text-primary-foreground"><Check className="size-3" /></span>}
              </button>
            ))}
          </div>
          <Button disabled={!picked || saving} onClick={savePicked}>{saving ? tr("Saving…", "محفوظ ہو رہا ہے…") : tr("Use this banner", "یہ بینر لگائیں")}</Button>
          <div className="border-t pt-3">
            <p className="mb-2 text-xs font-bold">{tr("Or your own shop photo", "یا اپنی دکان کی اصل تصویر")}</p>
            <ProductPhotoUploader aspect="wide" label={tr("Upload photo", "تصویر لگائیں")} onDone={async (photos) => { const p = photos[0]; if (p) await store(p.file); }} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
