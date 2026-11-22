import { tr } from "@/lib/i18n/tr";
import { useRef, useState } from "react";
import { Sparkles, Camera, Mic, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { classifyMenuCategory, MENU_CATEGORIES } from "../../../supabase/functions/_shared/menuCategories";
import { prepareMenuPages, validateMenuPages } from "@/lib/menuPages";

export type AiItem = { name: string; name_ur: string; price: number; unit: string; category: string; description: string };
type Kind = "menu" | "grocery" | "service";

const LABELS: Record<Kind, { title: string; hint: string }> = {
  menu: { title: "اسمارٹ مینو اسکینر", hint: "مثلاً: چکن بریانی 350 روپے، چکن کڑاہی آدھی 900 پوری 1700" },
  grocery: { title: "لکھ کر آئٹمز ڈالیں", hint: "مثلاً: چینی 1 کلو 160، آٹا 10 کلو 1200" },
  service: { title: "اسمارٹ سروس اسکینر", hint: "مثلاً: میں AC ٹھیک کرتا ہوں، گیس بھرتا ہوں، 15 سال تجربہ" },
};

export default function AiSetupAssistant({ kind, onSave }: { kind: Kind; onSave: (items: AiItem[]) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [pages, setPages] = useState<File[]>([]);
  const [preview, setPreview] = useState(false);
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<AiItem[]>([]);
  const label = LABELS[kind];

  const changePages = async (next: File[]) => {
    if (lock.current) return;
    const issue = validateMenuPages(next, kind === "menu" ? 5 : 1);
    if (issue) {
      toast.error(issue === "pages" ? tr("Choose up to 5 menu pages", "زیادہ سے زیادہ 5 مینو صفحات منتخب کریں") : issue === "size" ? tr("Each image must be under 10 MB", "ہر تصویر 10 MB سے کم ہو") : tr("Choose valid image files", "درست تصاویر منتخب کریں"));
      return;
    }
    lock.current = true;
    setBusy(true);
    try {
      const prepared = next.length ? await prepareMenuPages(next) : null;
      setPages(next); setImage(prepared);
    } catch { toast.error(tr("Could not prepare pages; use clearer or smaller images", "صفحات تیار نہیں ہوئے؛ واضح یا چھوٹی تصاویر منتخب کریں")); }
    finally { lock.current = false; setBusy(false); }
  };

  const run = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
    const { data, error } = await supabase.functions.invoke("ai-setup-assistant", { body: { kind, text, imageDataUrl: image } });
    if (error || data?.error) {
      let msg = data?.error;
      try { msg = msg || (await (error as any)?.context?.json())?.error; } catch { /* ignore */ }
      toast.error(msg || "اسکینر جواب نہیں دے سکا");
      return;
    }
    if (!data.items?.length) { toast.error("کوئی چیز نہیں ملی، صاف تصویر یا تفصیل دیں"); return; }
    setItems(kind === "menu" ? data.items.map((item: AiItem) => ({ ...item, category: classifyMenuCategory(item.name, item.category) })) : data.items);
    toast.success(`${data.items.length} چیزیں ملیں — دیکھ کر درست کریں (آج ${data.remaining} بار باقی)`);
    } catch { toast.error(tr("Scanner could not respond; your pages are retained", "اسکینر جواب نہیں دے سکا؛ صفحات محفوظ ہیں")); }
    finally { lock.current = false; setBusy(false); }
  };

  const update = (i: number, patch: Partial<AiItem>) => setItems(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const save = async () => {
    if (lock.current) return;
    const valid = items.filter(i => i.name.trim() && (kind === "service" || i.price > 0));
    if (!valid.length) { toast.error("کم از کم ایک چیز نام اور قیمت کے ساتھ ہو"); return; }
    if (valid.length !== items.length || valid.some(i => !Number.isFinite(i.price))) { toast.error(tr("Correct every item name and price before saving", "محفوظ کرنے سے پہلے ہر نام اور قیمت درست کریں")); return; }
    lock.current = true;
    setBusy(true);
    try { await onSave(valid); setItems([]); setText(""); setImage(null); setPages([]); setPreview(false); setOpen(false); }
    catch (error) { toast.error(error instanceof Error ? error.message : "محفوظ نہیں ہو سکا"); }
    finally { lock.current = false; setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={next => { if (!lock.current) setOpen(next); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" className="gap-1"><Sparkles className="h-4 w-4" />{kind === "grocery" ? tr("Quick add items", label.title) : label.title}</Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{label.title}</DialogTitle></DialogHeader>
        {items.length === 0 ? (
          <div className="space-y-3">
            <label className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 cursor-pointer text-sm">
              <Camera className="h-5 w-5 text-primary" />
              {kind === "menu" ? tr("Add menu pages", "مینو صفحات شامل کریں") : kind === "service" ? "کام کی تصویر (اختیاری)" : "مینو / ریٹ لسٹ کی تصویر لیں"}
              <input type="file" aria-label={tr("Menu pages", "مینو صفحات")} accept="image/*" multiple={kind === "menu"} disabled={busy} className="hidden" onChange={async e => {
                const selected = Array.from(e.target.files || []); e.target.value = "";
                if (selected.length) await changePages(kind === "menu" ? [...pages, ...selected] : selected);
              }} />
            </label>
            {pages.map((page, index) => <div key={`${index}-${page.name}`} className="flex items-center gap-2 text-sm min-w-0"><span className="shrink-0">{index + 1}</span><span className="truncate flex-1">{page.name}</span><Button size="icon" variant="ghost" disabled={busy} aria-label={`${tr("Remove page", "صفحہ ہٹائیں")} ${index + 1}`} onClick={() => void changePages(pages.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button></div>)}
            {image && <><Button variant="outline" className="w-full" onClick={() => setPreview(value => !value)}>{tr("Preview prepared pages", "تیار صفحات دیکھیں")}</Button>{preview && <a href={image} target="_blank" rel="noopener noreferrer"><img src={image} alt={tr("Prepared menu pages", "تیار مینو صفحات")} className="w-full h-auto border border-border rounded-md" /></a>}</>}
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Mic className="h-3 w-3" /> کی بورڈ کے مائیک 🎤 والے بٹن سے بول کر بھی لکھ سکتے ہیں
            </div>
            <Textarea rows={4} placeholder={label.hint} value={text} onChange={e => setText(e.target.value)} />
            <Button className="w-full h-11" onClick={run} disabled={busy || (!image && text.trim().length < 3)}>
              {busy ? "تیار ہو رہا ہے…" : "تیار کریں"}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">{tr("3 scans per 24 hours · up to 40 items per scan", "24 گھنٹوں میں 3 اسکین · فی اسکین زیادہ سے زیادہ 40 اشیاء")}</p>
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
            <Button variant="ghost" disabled={busy} className="w-full" onClick={() => setItems([])}>دوبارہ کوشش</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
