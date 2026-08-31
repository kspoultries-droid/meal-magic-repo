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
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold">اضافی سائز / وزن (اختیاری)</p>
          <p className="text-[11px] text-muted-foreground">
            اوپر والی بنیادی قیمت اور وزن گاہک کو پہلے سے نظر آئے گا۔ یہاں صرف <b>اضافی</b> سائز لکھیں،
            مثلاً "آدھا کلو — 1300"۔ ضرورت نہ ہو تو خالی چھوڑ دیں۔
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={add}><Plus className="h-3 w-3 mr-1" /> سائز</Button>
      </div>
      {(value || []).map((v, i) => (
        <div key={v.id} className="flex gap-2">
          <Input placeholder="مثلاً آدھا کلو / 6 پیس" value={v.label} onChange={(e) => update(i, { label: e.target.value })} />
          <Input type="number" placeholder="قیمت" value={v.price || ""} onChange={(e) => update(i, { price: Number(e.target.value) })} className="w-28" />
          <Button type="button" size="sm" variant="ghost" onClick={() => remove(i)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
        </div>
      ))}
    </div>
  );
};

type Preset = "optional-many" | "optional-one" | "required-one" | "required-many";

const presetOf = (g: OptionGroupRow): Preset => {
  if (g.min >= 1 && g.max <= 1) return "required-one";
  if (g.min >= 1) return "required-many";
  if (g.max <= 1) return "optional-one";
  return "optional-many";
};

const applyPreset = (g: OptionGroupRow, p: Preset): Partial<OptionGroupRow> => {
  const count = Math.max(1, g.choices.length);
  switch (p) {
    case "required-one": return { min: 1, max: 1 };
    case "optional-one": return { min: 0, max: 1 };
    case "required-many": return { min: 1, max: count };
    default: return { min: 0, max: count };
  }
};

export const OptionGroupsEditor = ({ value, onChange }: { value: OptionGroupRow[]; onChange: (v: OptionGroupRow[]) => void }) => {
  const addGroup = () => onChange([...(value || []), { id: uid(), name: "", min: 0, max: 99, choices: [{ id: uid(), label: "", price_delta: 0 }] }]);
  const updateGroup = (i: number, patch: Partial<OptionGroupRow>) => onChange(value.map((g, idx) => idx === i ? { ...g, ...patch } : g));
  const removeGroup = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="border rounded-lg p-3 space-y-3 bg-secondary/30">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold">ایکسٹرا / فلیورز (اختیاری)</p>
          <p className="text-[11px] text-muted-foreground">
            <b>گروپ کا نام</b> = سوال (مثلاً "ایکسٹرا کیا چاہیے؟" یا "مرچ")۔ <b>چوائس</b> = اُس کے جواب
            (نان +30، رائتہ +80، سلاد +50)۔ نیچے سے طے کریں کہ گاہک کے لیے یہ لازمی ہے یا نہیں۔
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={addGroup}><Plus className="h-3 w-3 mr-1" /> گروپ</Button>
      </div>
      {(value || []).map((g, gi) => (
        <div key={g.id} className="border rounded-md p-2 bg-background space-y-2">
          <div className="flex gap-2 items-center">
            <Input placeholder="گروپ کا نام (مثلاً ایکسٹرا)" value={g.name} onChange={(e) => updateGroup(gi, { name: e.target.value })} className="flex-1" />
            <Button type="button" size="sm" variant="ghost" onClick={() => removeGroup(gi)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
          </div>
          <select
            className="w-full border rounded-md p-2 bg-background text-sm"
            value={presetOf(g)}
            onChange={(e) => updateGroup(gi, applyPreset(g, e.target.value as Preset))}
          >
            <option value="optional-many">اختیاری — گاہک جتنے چاہے منتخب کرے (یا کوئی نہیں)</option>
            <option value="optional-one">اختیاری — زیادہ سے زیادہ ایک</option>
            <option value="required-one">لازمی — ایک منتخب کرنا ضروری</option>
            <option value="required-many">لازمی — کم از کم ایک، کئی منتخب ہو سکتے ہیں</option>
          </select>
          <div className="space-y-1.5 pl-2 border-l-2 border-primary/30">
            {g.choices.map((c, ci) => (
              <div key={c.id} className="flex gap-2">
                <Input placeholder="چوائس (مثلاً نان)" value={c.label} onChange={(e) => {
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
              const choices = [...g.choices, { id: uid(), label: "", price_delta: 0 }];
              const grown = g.max >= g.choices.length ? { max: Math.max(choices.length, g.max) } : {};
              updateGroup(gi, { choices, ...grown });
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
    .map((grp) => {
      const choices = grp.choices.filter((c) => c.label.trim());
      const max = Math.min(Math.max(1, grp.max || 1), Math.max(1, choices.length));
      const min = Math.min(Math.max(0, grp.min || 0), max);
      return { ...grp, name: grp.name.trim(), choices, min, max };
    })
    .filter((grp) => grp.name && grp.choices.length > 0);
