import { useState } from "react";
import { Sparkles, Camera, Mic, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { classifyMenuCategory, MENU_CATEGORIES } from "../../../supabase/functions/_shared/menuCategories";

export type AiItem = { name: string; name_ur: string; price: number; unit: string; category: string; description: string };
type Kind = "menu" | "grocery" | "service";

const LABELS: Record<Kind, { title: string; hint: string }> = {
  menu: { title: "اسمارٹ مینو اسکینر", hint: "مثلاً: چکن بریانی 350 روپے، چکن کڑاہی آدھی 900 پوری 1700" },
  grocery: { title: "اسمارٹ آئٹم اسکینر", hint: "مثلاً: چینی 1 کلو 160، آٹا 10 کلو 1200" },
  service: { title: "اسمارٹ سروس اسکینر", hint: "مثلاً: میں AC ٹھیک کرتا ہوں، گیس بھرتا ہوں، 15 سال تجربہ" },
};

const toDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const img = new Image();
  img.onload = () => {
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = img.width * scale; c.height = img.height * scale;
    const ctx = c.getContext("2d");
    if (!ctx) { reject(new Error("تصویر تیار نہیں ہو سکی")); return; }
    ctx.drawImage(img, 0, 0, c.width, c.height);
    resolve(c.toDataURL("image/jpeg", 0.8));
  };
  img.onerror = reject;
  img.src = URL.createObjectURL(file);
});

export default function AiSetupAssistant({ kind, onSave }: { kind: Kind; onSave: (items: AiItem[]) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<AiItem[]>([]);
  const label = LABELS[kind];

  const run = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("ai-setup-assistant", { body: { kind, text, imageDataUrl: image } });
    setBusy(false);
    if (error || data?.error) {
      let msg = data?.error;
      try { msg = msg || (await (error as any)?.context?.json())?.error; } catch { /* ignore */ }
      toast.error(msg || "اسکینر جواب نہیں دے سکا");
      return;
    }
    if (!data.items?.length) { toast.error("کوئی چیز نہیں ملی، صاف تصویر یا تفصیل دیں"); return; }
    setItems(kind === "menu" ? data.items.map((item: AiItem) => ({ ...item, category: classifyMenuCategory(item.name, item.category) })) : data.items);
    toast.success(`${data.items.length} چیزیں ملیں — دیکھ کر درست کریں (آج ${data.remaining} بار باقی)`);
  };

  const update = (i: number, patch: Partial<AiItem>) => setItems(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const save = async () => {
    const valid = items.filter(i => i.name.trim() && (kind === "service" || i.price > 0));
    if (!valid.length) { toast.error("کم از کم ایک چیز نام اور قیمت کے ساتھ ہو"); return; }
    setBusy(true);
    try { await onSave(valid); setItems([]); setText(""); setImage(null); setOpen(false); }
    catch (error) { toast.error(error instanceof Error ? error.message : "محفوظ نہیں ہو سکا"); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" className="gap-1"><Sparkles className="h-4 w-4" />{label.title}</Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{label.title}</DialogTitle></DialogHeader>
        {items.length === 0 ? (
          <div className="space-y-3">
            <label className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 cursor-pointer text-sm">
              <Camera className="h-5 w-5 text-primary" />
              {image ? "✓ تصویر لگ گئی (بدلنے کے لیے دبائیں)" : kind === "service" ? "کام کی تصویر (اختیاری)" : "مینو / ریٹ لسٹ کی تصویر لیں"}
              <input type="file" accept="image/*" className="hidden" onChange={async e => {
                const f = e.target.files?.[0]; if (f) setImage(await toDataUrl(f));
              }} />
            </label>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Mic className="h-3 w-3" /> کی بورڈ کے مائیک 🎤 والے بٹن سے بول کر بھی لکھ سکتے ہیں
            </div>
            <Textarea rows={4} placeholder={label.hint} value={text} onChange={e => setText(e.target.value)} />
            <Button className="w-full h-11" onClick={run} disabled={busy || (!image && text.trim().length < 3)}>
              {busy ? "تیار ہو رہا ہے…" : "تیار کریں"}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">روزانہ 3 بار استعمال کر سکتے ہیں</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="border rounded-lg p-2 space-y-1">
                <div className="flex gap-1">
                  <Input value={it.name} onChange={e => update(i, { name: e.target.value })} />
                  <Button size="icon" variant="ghost" onClick={() => setItems(items.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                </div>
                <p className="text-xs text-muted-foreground">{it.name_ur} · {it.category}</p>
                {kind === "menu" && <select aria-label="ڈش کی کیٹیگری" className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm" value={it.category} onChange={e => update(i, { category: e.target.value })}>{[...new Set([...MENU_CATEGORIES, it.category])].map(category => <option key={category} value={category}>{category}</option>)}</select>}
                <div className="grid grid-cols-2 gap-1">
                  <Input type="number" value={it.price} onChange={e => update(i, { price: Number(e.target.value) })} placeholder="قیمت" />
                  <Input value={it.unit} onChange={e => update(i, { unit: e.target.value })} placeholder="سائز / یونٹ" />
                </div>
              </div>
            ))}
            <Button className="w-full h-11" onClick={save} disabled={busy}>{busy ? "محفوظ ہو رہا ہے…" : `${items.length} چیزیں محفوظ کریں`}</Button>
            <Button variant="ghost" className="w-full" onClick={() => setItems([])}>دوبارہ کوشش</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
