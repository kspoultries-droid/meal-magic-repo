import { useEffect, useState } from "react";
import { Palette, RotateCcw, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HeroConfig, heroBackgroundStyle } from "@/lib/heroConfig";

interface Props {
  config: HeroConfig;
  defaults: HeroConfig;
  onSave: (next: HeroConfig) => Promise<void>;
}

const PRESETS: { name: string; from: string; to: string; text: string; accent: string }[] = [
  { name: "ایمبر پریمیم", from: "#fff6ec", to: "#ffe7cd", text: "#2b1c10", accent: "#c2701a" },
  { name: "گرین کلاسک", from: "#13a05f", to: "#0c8f7a", text: "#ffffff", accent: "#ffffff" },
  { name: "مڈ نائٹ", from: "#111827", to: "#1f2937", text: "#f9fafb", accent: "#fbbf24" },
  { name: "رائل بلیو", from: "#1d4ed8", to: "#0ea5e9", text: "#ffffff", accent: "#fde68a" },
  { name: "روز گولڈ", from: "#fde7ef", to: "#fbd5c4", text: "#4a1d2b", accent: "#be185d" },
  { name: "سینڈ لائٹ", from: "#ffffff", to: "#f1f5f9", text: "#0f172a", accent: "#0f766e" },
];

const ColorField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div className="space-y-1">
    <Label className="text-[11px] font-bold">{label}</Label>
    <div className="flex items-center gap-2">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-10 cursor-pointer rounded-md border border-border bg-card p-1" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-9 flex-1 text-xs" />
    </div>
  </div>
);

const SliderField = ({ label, value, min, max, onChange, suffix = "px" }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; suffix?: string }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between"><Label className="text-[11px] font-bold">{label}</Label><span className="text-[11px] text-muted-foreground">{value}{suffix}</span></div>
    <Slider value={[value]} min={min} max={max} step={1} onValueChange={([v]) => onChange(v)} />
  </div>
);

const HeroEditor = ({ config, defaults, onSave }: Props) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<HeroConfig>(config);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setDraft(config); }, [open, config]);
  const set = <K extends keyof HeroConfig>(field: K, value: HeroConfig[K]) => setDraft((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(draft);
      toast.success("ہیڈر محفوظ ہو گیا");
      setOpen(false);
    } catch {
      toast.error("محفوظ نہیں ہو سکا، دوبارہ کوشش کریں");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="secondary" className="h-8 gap-1 rounded-full px-3 text-[11px] font-bold shadow-sm">
          <Settings2 className="size-3.5" /> ہیڈر ایڈٹ کریں
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle className="text-base">ہیڈر (ہیرو) سیٹنگز</DialogTitle></DialogHeader>

        <div className="overflow-hidden rounded-xl border border-border">
          <div style={heroBackgroundStyle(draft)} className="px-4">
            <div style={{ textAlign: draft.align }}>
              <p className="text-[11px] font-bold" style={{ color: draft.accentColor }}>{draft.eyebrow}</p>
              <p className="font-display font-bold leading-tight" style={{ fontSize: draft.titleSize }}>{draft.title}</p>
              <p className="mt-1 text-xs opacity-75">{draft.subtitle}</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="text">
          <TabsList className="w-full">
            <TabsTrigger value="text" className="flex-1 text-xs">تحریر</TabsTrigger>
            <TabsTrigger value="color" className="flex-1 text-xs">رنگ</TabsTrigger>
            <TabsTrigger value="size" className="flex-1 text-xs">سائز</TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-3 pt-3">
            <div className="space-y-1"><Label className="text-[11px] font-bold">چھوٹی سطر (اوپر)</Label><Input value={draft.eyebrow} onChange={(e) => set("eyebrow", e.target.value)} className="h-9 text-sm" /></div>
            <div className="space-y-1"><Label className="text-[11px] font-bold">مرکزی عنوان</Label><Input value={draft.title} onChange={(e) => set("title", e.target.value)} className="h-9 text-sm" /></div>
            <div className="space-y-1"><Label className="text-[11px] font-bold">ذیلی سطر</Label><Input value={draft.subtitle} onChange={(e) => set("subtitle", e.target.value)} className="h-9 text-sm" /></div>
            <div className="space-y-1"><Label className="text-[11px] font-bold">تلاش باکس کا متن</Label><Input value={draft.searchPlaceholder} onChange={(e) => set("searchPlaceholder", e.target.value)} className="h-9 text-sm" /></div>
            <div className="flex items-center justify-between rounded-lg border border-border p-2">
              <Label className="text-[11px] font-bold">نیچے کی تین جھلکیاں دکھائیں</Label>
              <Switch checked={draft.showBadges} onCheckedChange={(v) => set("showBadges", v)} />
            </div>
            {draft.showBadges && (
              <div className="grid grid-cols-1 gap-2">
                <Input value={draft.badge1} onChange={(e) => set("badge1", e.target.value)} className="h-9 text-sm" placeholder="جھلک 1" />
                <Input value={draft.badge2} onChange={(e) => set("badge2", e.target.value)} className="h-9 text-sm" placeholder="جھلک 2" />
                <Input value={draft.badge3} onChange={(e) => set("badge3", e.target.value)} className="h-9 text-sm" placeholder="جھلک 3" />
              </div>
            )}
          </TabsContent>

          <TabsContent value="color" className="space-y-3 pt-3">
            <div>
              <Label className="mb-2 flex items-center gap-1 text-[11px] font-bold"><Palette className="size-3.5" /> تیار پریمیم تھیمز</Label>
              <div className="grid grid-cols-3 gap-2">
                {PRESETS.map((preset) => (
                  <button key={preset.name} type="button" onClick={() => setDraft((prev) => ({ ...prev, bgFrom: preset.from, bgTo: preset.to, textColor: preset.text, accentColor: preset.accent }))} className="overflow-hidden rounded-lg border border-border text-[10px] font-bold">
                    <span className="block h-8 w-full" style={{ background: `linear-gradient(135deg, ${preset.from}, ${preset.to})` }} />
                    <span className="block truncate p-1">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <ColorField label="پس منظر رنگ 1" value={draft.bgFrom} onChange={(v) => set("bgFrom", v)} />
              <ColorField label="پس منظر رنگ 2" value={draft.bgTo} onChange={(v) => set("bgTo", v)} />
              <ColorField label="تحریر کا رنگ" value={draft.textColor} onChange={(v) => set("textColor", v)} />
              <ColorField label="نمایاں رنگ" value={draft.accentColor} onChange={(v) => set("accentColor", v)} />
            </div>
            <SliderField label="گریڈینٹ زاویہ" value={draft.angle} min={0} max={360} onChange={(v) => set("angle", v)} suffix="°" />
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">پس منظر تصویر کا لنک (اختیاری)</Label>
              <Input value={draft.bgImage} onChange={(e) => set("bgImage", e.target.value)} placeholder="https://..." className="h-9 text-sm" />
            </div>
            {draft.bgImage && <SliderField label="تصویر پر رنگ کی تہہ" value={draft.overlay} min={0} max={100} onChange={(v) => set("overlay", v)} suffix="%" />}
          </TabsContent>

          <TabsContent value="size" className="space-y-3 pt-3">
            <SliderField label="عنوان کا سائز" value={draft.titleSize} min={16} max={48} onChange={(v) => set("titleSize", v)} />
            <SliderField label="اوپر نیچے جگہ" value={draft.padding} min={6} max={48} onChange={(v) => set("padding", v)} />
            <SliderField label="کونوں کی گولائی" value={draft.radius} min={0} max={36} onChange={(v) => set("radius", v)} />
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">تحریر کی سمت</Label>
              <div className="flex gap-2">
                {(["right", "center", "left"] as const).map((option) => (
                  <Button key={option} type="button" size="sm" variant={draft.align === option ? "default" : "outline"} className="flex-1 text-[11px]" onClick={() => set("align", option)}>
                    {option === "right" ? "دائیں" : option === "center" ? "درمیان" : "بائیں"}
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 pt-1">
          <Button onClick={handleSave} disabled={saving} className="flex-1">{saving ? "محفوظ ہو رہا ہے…" : "محفوظ کریں"}</Button>
          <Button type="button" variant="outline" onClick={() => setDraft(defaults)}><RotateCcw className="size-4" /></Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HeroEditor;
