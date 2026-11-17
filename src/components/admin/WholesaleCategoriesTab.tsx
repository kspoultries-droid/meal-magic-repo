import { tr } from "@/lib/i18n/tr";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import * as LucideIcons from "lucide-react";
import { Plus, Trash2, Pencil, ArrowUp, ArrowDown, Eye, EyeOff, Wand2, Package } from "lucide-react";
import { CATEGORY_ICONS, missingPresets } from "@/lib/categoryPresets";

interface Cat { id: string; name: string; name_ur: string | null; icon: string; sort_order: number; is_active: boolean; kind?: string }
type Form = { name: string; name_ur: string; icon: string; kind: string };
const blank: Form = { name: "", name_ur: "", icon: "Package", kind: "item" };
const IconOf = ({ name, className }: { name: string; className?: string }) => { const I = (LucideIcons as any)[name] || Package; return <I className={className} />; };

const WholesaleCategoriesTab = () => {
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<"item" | "shop">("item");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(blank);
  const [busy, setBusy] = useState(false);

  const fetchCats = async () => {
    setLoading(true);
    const { data } = await supabase.from("wholesale_categories").select("*").order("sort_order");
    setCats(((data as any) || []).filter((c: Cat) => c.name !== "All"));
    setLoading(false);
  };
  useEffect(() => { fetchCats(); }, []);

  const list = cats.filter((c) => (c.kind ?? "item") === kind);
  const presets = missingPresets(cats).filter((p) => p.kind === kind);

  const openNew = () => { setEditId(null); setForm({ ...blank, kind }); setOpen(true); };
  const openEdit = (c: Cat) => { setEditId(c.id); setForm({ name: c.name, name_ur: c.name_ur || "", icon: c.icon, kind: c.kind || "item" }); setOpen(true); };

  const save = async () => {
    if (!form.name.trim()) return toast.error(tr("Enter name", "نام درج کریں"));
    setBusy(true);
    const payload = { name: form.name.trim(), name_ur: form.name_ur.trim() || null, icon: form.icon, kind: form.kind };
    const { error } = editId
      ? await supabase.from("wholesale_categories").update(payload).eq("id", editId)
      : await supabase.from("wholesale_categories").insert({ ...payload, sort_order: (list.at(-1)?.sort_order ?? 0) + 1 } as any);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(tr("Saved", "محفوظ ہو گیا"));
    setOpen(false); fetchCats();
  };

  const addPresets = async () => {
    if (!presets.length) return;
    setBusy(true);
    const base = list.at(-1)?.sort_order ?? 0;
    const { error } = await supabase.from("wholesale_categories").insert(presets.map((p, i) => ({ ...p, sort_order: base + i + 1, is_active: true })) as any);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(tr(`${presets.length} categories added`, `${presets.length} کیٹیگریز شامل ہو گئیں`));
    fetchCats();
  };

  const move = async (i: number, dir: -1 | 1) => {
    const a = list[i], b = list[i + dir];
    if (!a || !b) return;
    const sa = a.sort_order === b.sort_order ? i : a.sort_order, sb = a.sort_order === b.sort_order ? i + dir : b.sort_order;
    await Promise.all([
      supabase.from("wholesale_categories").update({ sort_order: sb }).eq("id", a.id),
      supabase.from("wholesale_categories").update({ sort_order: sa }).eq("id", b.id),
    ]);
    fetchCats();
  };
  const toggle = async (c: Cat) => { await supabase.from("wholesale_categories").update({ is_active: !c.is_active }).eq("id", c.id); fetchCats(); };
  const remove = async (c: Cat) => {
    if (!confirm(tr(`Delete "${c.name}"?`, `«${c.name_ur || c.name}» حذف کریں؟`))) return;
    const { error } = await supabase.from("wholesale_categories").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    fetchCats();
  };

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg">{tr("Bazar Categories", "بازار کیٹیگریز")}</CardTitle>
          <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />{tr("New", "نئی")}</Button>
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          {(["item", "shop"] as const).map((k) => (
            <Button key={k} size="sm" variant={kind === k ? "default" : "ghost"} onClick={() => setKind(k)}>
              {k === "item" ? tr("Item categories", "اشیاء کی کیٹیگری") : tr("Shop types", "دکان کی قسم")}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {presets.length > 0 && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
            <p className="text-sm font-semibold">{tr("Ready-made categories", "تیار شدہ کیٹیگریز")}</p>
            <p className="text-xs text-muted-foreground mb-2">{presets.map((p) => tr(p.name, p.name_ur)).join("، ")}</p>
            <Button size="sm" onClick={addPresets} disabled={busy}><Wand2 className="h-4 w-4 mr-1" />{tr(`Add all ${presets.length}`, `تمام ${presets.length} شامل کریں`)}</Button>
          </div>
        )}
        {loading ? <p className="text-sm text-muted-foreground">{tr("Loading...", "لوڈ ہو رہا ہے...")}</p> : list.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{tr("No categories yet", "ابھی کوئی کیٹیگری نہیں")}</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {list.map((c, i) => (
              <li key={c.id} className={`flex items-center gap-2 p-2 ${c.is_active ? "" : "opacity-50"}`}>
                <div className="flex flex-col">
                  <Button size="icon" variant="ghost" className="h-6 w-6" disabled={i === 0} onClick={() => move(i, -1)} aria-label={tr("Move up", "اوپر")}><ArrowUp className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6" disabled={i === list.length - 1} onClick={() => move(i, 1)} aria-label={tr("Move down", "نیچے")}><ArrowDown className="h-3.5 w-3.5" /></Button>
                </div>
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-primary"><IconOf name={c.icon} className="size-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{c.name}</p>
                  <p className="truncate text-xs text-muted-foreground" dir="rtl">{c.name_ur || "—"}</p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => toggle(c)} aria-label={c.is_active ? tr("Hide", "چھپائیں") : tr("Show", "دکھائیں")}>{c.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</Button>
                <Button size="icon" variant="ghost" onClick={() => openEdit(c)} aria-label={tr("Edit", "تبدیل")}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(c)} aria-label={tr("Delete", "حذف")}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? tr("Edit category", "کیٹیگری تبدیل کریں") : tr("New category", "نئی کیٹیگری")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex justify-center">
              <span className="inline-flex h-10 items-center gap-1.5 rounded-full border bg-card px-3 text-sm font-semibold shadow-soft">
                <span className="grid size-7 place-items-center rounded-full bg-accent text-primary"><IconOf name={form.icon} className="size-4" /></span>
                {form.name || tr("Preview", "نمونہ")}
              </span>
            </div>
            <Input placeholder={tr("English name (e.g. Watches)", "انگریزی نام (مثلاً Watches)")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input dir="rtl" placeholder={tr("Urdu name", "اردو نام (مثلاً گھڑیاں)")} value={form.name_ur} onChange={(e) => setForm({ ...form, name_ur: e.target.value })} />
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
              {(["item", "shop"] as const).map((k) => (
                <Button key={k} type="button" size="sm" variant={form.kind === k ? "default" : "ghost"} onClick={() => setForm({ ...form, kind: k })}>
                  {k === "item" ? tr("Item category", "اشیاء کیٹیگری") : tr("Shop type", "دکان کی قسم")}
                </Button>
              ))}
            </div>
            <p className="text-sm font-medium">{tr("Choose icon", "آئیکن منتخب کریں")}</p>
            <div className="grid grid-cols-5 gap-1.5">
              {CATEGORY_ICONS.map((o) => (
                <button key={o.icon} type="button" onClick={() => setForm({ ...form, icon: o.icon })} aria-label={o.en}
                  className={`flex flex-col items-center gap-0.5 rounded-lg border p-1.5 text-[10px] ${form.icon === o.icon ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                  <IconOf name={o.icon} className="size-5" /><span className="truncate w-full text-center">{tr(o.en, o.ur)}</span>
                </button>
              ))}
            </div>
            <Button className="w-full" onClick={save} disabled={busy}>{tr("Save", "محفوظ کریں")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default WholesaleCategoriesTab;
