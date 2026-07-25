import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

export interface VariantRow { id: string; label: string; price: number }
export interface ChoiceRow { id: string; label: string; price_delta: number }
export interface OptionGroupRow { id: string; name: string; min: number; max: number; choices: ChoiceRow[] }

const uid = () => Math.random().toString(36).slice(2, 9);

export const VariantsEditor = ({ value, onChange }: { value: VariantRow[]; onChange: (v: VariantRow[]) => void }) => {
  const add = () => onChange([...(value || []), { id: uid(), label: "", price: 0 }]);
  const update = (i: number, patch: Partial<VariantRow>) => onChange(value.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  return (
    <div className="border rounded-lg p-3 space-y-2 bg-secondary/30">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold">سائز / وزن (Variants)</p>
          <p className="text-[11px] text-muted-foreground">مثلاً "1 kg — 2500"، "آدھا kg — 1300"۔ خالی چھوڑیں اگر ایک ہی سائز ہے۔</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={add}><Plus className="h-3 w-3 mr-1" /> variant</Button>
      </div>
      {(value || []).map((v, i) => (
        <div key={v.id} className="flex gap-2">
          <Input placeholder="مثلاً 1 kg" value={v.label} onChange={(e) => update(i, { label: e.target.value })} />
          <Input type="number" placeholder="قیمت" value={v.price || ""} onChange={(e) => update(i, { price: Number(e.target.value) })} className="w-28" />
          <Button type="button" size="sm" variant="ghost" onClick={() => remove(i)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
        </div>
      ))}
    </div>
  );
};

export const OptionGroupsEditor = ({ value, onChange }: { value: OptionGroupRow[]; onChange: (v: OptionGroupRow[]) => void }) => {
  const addGroup = () => onChange([...(value || []), { id: uid(), name: "", min: 0, max: 1, choices: [{ id: uid(), label: "", price_delta: 0 }] }]);
  const updateGroup = (i: number, patch: Partial<OptionGroupRow>) => onChange(value.map((g, idx) => idx === i ? { ...g, ...patch } : g));
  const removeGroup = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="border rounded-lg p-3 space-y-3 bg-secondary/30">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold">فلیورز / ایکسٹرا (Option Groups)</p>
          <p className="text-[11px] text-muted-foreground">مثلاً "مرچ" گروپ میں: ہری/لال/مکس/بغیر۔ یا "ایکسٹرا" میں: نان +30، رائتہ +80۔</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={addGroup}><Plus className="h-3 w-3 mr-1" /> گروپ</Button>
      </div>
      {(value || []).map((g, gi) => (
        <div key={g.id} className="border rounded-md p-2 bg-background space-y-2">
          <div className="flex gap-2 items-center">
            <Input placeholder="گروپ کا نام (مثلاً مرچ)" value={g.name} onChange={(e) => updateGroup(gi, { name: e.target.value })} className="flex-1" />
            <div className="flex items-center gap-1 text-xs">
              <span>Min</span>
              <Input type="number" value={g.min} onChange={(e) => updateGroup(gi, { min: Math.max(0, Number(e.target.value)) })} className="w-14 h-8" />
              <span>Max</span>
              <Input type="number" value={g.max} onChange={(e) => updateGroup(gi, { max: Math.max(1, Number(e.target.value)) })} className="w-14 h-8" />
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={() => removeGroup(gi)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
          </div>
          <div className="space-y-1.5 pl-2 border-l-2 border-primary/30">
            {g.choices.map((c, ci) => (
              <div key={c.id} className="flex gap-2">
                <Input placeholder="چوائس (مثلاً ہری مرچ)" value={c.label} onChange={(e) => {
                  const choices = g.choices.map((x, idx) => idx === ci ? { ...x, label: e.target.value } : x);
                  updateGroup(gi, { choices });
                }} />
                <Input type="number" placeholder="+ / − Rs" value={c.price_delta || ""} onChange={(e) => {
                  const choices = g.choices.map((x, idx) => idx === ci ? { ...x, price_delta: Number(e.target.value) } : x);
                  updateGroup(gi, { choices });
                }} className="w-24" />
                <Button type="button" size="sm" variant="ghost" onClick={() => {
                  updateGroup(gi, { choices: g.choices.filter((_, idx) => idx !== ci) });
                }}><Trash2 className="h-3 w-3 text-destructive" /></Button>
              </div>
            ))}
            <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
              updateGroup(gi, { choices: [...g.choices, { id: uid(), label: "", price_delta: 0 }] });
            }}><Plus className="h-3 w-3 mr-1" /> چوائس</Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export const sanitizeVariants = (v: VariantRow[]): VariantRow[] =>
  (v || []).filter((r) => r.label.trim() && r.price > 0);

export const sanitizeGroups = (g: OptionGroupRow[]): OptionGroupRow[] =>
  (g || [])
    .map((grp) => ({ ...grp, name: grp.name.trim(), choices: grp.choices.filter((c) => c.label.trim()) }))
    .filter((grp) => grp.name && grp.choices.length > 0);
