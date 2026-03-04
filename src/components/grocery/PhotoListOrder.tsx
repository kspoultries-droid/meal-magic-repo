import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Camera, FileImage, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PhotoListOrderProps {
  storeId: string;
  storeName: string;
}

const PhotoListOrder = ({ storeId, storeName }: PhotoListOrderProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset input so same file can be re-selected
    e.target.value = "";
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!user) { toast.error("پہلے لاگ ان کریں / Please login first"); return; }
    if (!imageFile) { toast.error("راشن لسٹ کی تصویر ڈالیں / Upload your list photo"); return; }
    if (!address.trim()) { toast.error("پتہ درج کریں / Enter delivery address"); return; }

    setSubmitting(true);
    try {
      const ext = imageFile.name.split('.').pop();
      const path = `list-orders/${user.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("product-images").upload(path, imageFile);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);

      const { error } = await supabase.from("grocery_list_orders").insert({
        customer_id: user.id,
        store_id: storeId,
        image_url: urlData.publicUrl,
        notes: notes.trim() || null,
        delivery_address: address.trim(),
      });
      if (error) throw error;

      toast.success("راشن لسٹ بھیج دی گئی! دکاندار جلد جواب دے گا\nList sent! Shopkeeper will respond soon");
      setOpen(false);
      setImageFile(null);
      setImagePreview(null);
      setNotes("");
      setAddress("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full gap-2 bg-gradient-to-r from-primary to-emerald-600 text-primary-foreground font-bold text-xs py-3 rounded-xl shadow">
          <FileImage className="w-4 h-4" />
          📸 راشن لسٹ بھیجیں / Send List Photo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">
            📋 راشن لسٹ بھیجیں
            <br />
            <span className="text-xs text-muted-foreground font-normal">Send your ration list to {storeName}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Hidden file inputs - kept outside label to avoid Safari/mobile issues */}
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
        <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

        <div className="space-y-4">
          {imagePreview ? (
            <div className="relative rounded-xl overflow-hidden border-2 border-primary/30">
              <img src={imagePreview} alt="List preview" className="w-full max-h-52 object-contain bg-secondary" />
              <button
                className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold"
                onClick={() => { setImageFile(null); setImagePreview(null); }}
              >✕</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="flex flex-col items-center gap-2 p-6 bg-secondary rounded-xl cursor-pointer border-2 border-dashed border-primary/30 hover:border-primary transition-colors"
                onClick={() => { if (cameraInputRef.current) { cameraInputRef.current.value = ""; cameraInputRef.current.click(); } }}
              >
                <Camera className="w-8 h-8 text-primary" />
                <span className="text-xs font-bold text-foreground">کیمرہ / Camera</span>
              </button>
              <button
                type="button"
                className="flex flex-col items-center gap-2 p-6 bg-secondary rounded-xl cursor-pointer border-2 border-dashed border-primary/30 hover:border-primary transition-colors"
                onClick={() => { if (galleryInputRef.current) { galleryInputRef.current.value = ""; galleryInputRef.current.click(); } }}
              >
                <FileImage className="w-8 h-8 text-primary" />
                <span className="text-xs font-bold text-foreground">گیلری / Gallery</span>
              </button>
            </div>
          )}

          <Input
            placeholder="ڈلیوری ایڈریس / Delivery Address *"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <Input
            placeholder="کوئی ہدایات (اختیاری) / Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <p className="text-xs text-muted-foreground text-center bg-accent/50 p-2 rounded-lg">
            💡 دکاندار آپ کی لسٹ دیکھ کر قیمت بتائے گا، پھر آپ تصدیق کریں گے
            <br />
            Shopkeeper will review & quote price, then you confirm
          </p>

          <Button onClick={handleSubmit} disabled={submitting || !imageFile} className="w-full gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {submitting ? "بھیج رہے ہیں..." : "بھیجیں / Send"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PhotoListOrder;
