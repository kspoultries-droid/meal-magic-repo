import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const CATEGORIES = [
  { key: "missing", label: "کوئی چیز کم آئی" },
  { key: "wrong", label: "غلط چیز آئی" },
  { key: "late", label: "بہت دیر ہوئی" },
  { key: "quality", label: "خراب / ٹھنڈا کھانا" },
  { key: "rider", label: "رائیڈر کا رویہ" },
  { key: "payment", label: "ادائیگی کا مسئلہ" },
  { key: "other", label: "کوئی اور مسئلہ" },
];

export default function ReportProblemDialog({ orderId, orderKind = "food" }: { orderId: string; orderKind?: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState("");
  const [desc, setDesc] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user || !cat) { toast.error("مسئلے کی قسم منتخب کریں"); return; }
    setBusy(true);
    let photo_url: string | null = null;
    if (file) {
      const path = `${user.id}/support-${Date.now()}.${file.name.split(".").pop() || "jpg"}`;
      const { error: upErr } = await supabase.storage.from("product-images").upload(path, file);
      if (!upErr) photo_url = supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
    }
    const { error } = await (supabase as any).from("support_tickets").insert({
      user_id: user.id, order_id: orderId, order_kind: orderKind, category: cat, description: desc.slice(0, 1000), photo_url,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("آپ کی شکایت درج ہو گئی — سپورٹ ٹیم جلد رابطہ کرے گی");
    setOpen(false); setCat(""); setDesc(""); setFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">🆘 مسئلہ بتائیں</Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>آرڈر میں کیا مسئلہ ہے؟</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map((c) => (
            <button key={c.key} onClick={() => setCat(c.key)}
              className={`rounded-lg border p-2 text-xs font-bold ${cat === c.key ? "border-primary bg-primary text-primary-foreground" : "bg-background"}`}>
              {c.label}
            </button>
          ))}
        </div>
        <Textarea placeholder="تفصیل لکھیں (اختیاری)" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={1000} />
        <label className="text-xs">📷 تصویر (اختیاری)
          <input type="file" accept="image/*" className="mt-1 block w-full text-xs" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </label>
        <Button onClick={submit} disabled={busy || !cat}>{busy ? "بھیجا جا رہا ہے..." : "شکایت بھیجیں"}</Button>
      </DialogContent>
    </Dialog>
  );
}
