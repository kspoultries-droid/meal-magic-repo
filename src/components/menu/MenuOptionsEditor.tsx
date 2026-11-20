import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { tr } from "@/lib/i18n/tr";

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
          <p className="text-sm font-bold">{tr("Additional sizes (optional)", "اضافی سائز (اختیاری)")}</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={add}><Plus className="h-3 w-3 mr-1" /> {tr("Size", "سائز")}</Button>
      </div>
      {(value || []).map((v, i) => (
        <div key={v.id} className="flex gap-2">
          <Input aria-label={tr("Additional size", "اضافی سائز")} placeholder={tr("e.g. 6 pieces", "مثلاً 6 عدد")} value={v.label} onChange={(e) => update(i, { label: e.target.value })} />
          <Input type="number" aria-label={tr("Size price", "سائز کی قیمت")} placeholder={tr("Price", "قیمت")} value={v.price || ""} onChange={(e) => update(i, { price: Number(e.target.value) })} className="w-24 shrink-0" />
          <Button type="button" size="sm" variant="ghost" aria-label={tr("Remove size", "سائز ہٹائیں")} onClick={() => remove(i)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
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
          <p className="text-sm font-bold">{tr("Extras / flavours (optional)", "ایکسٹرا / فلیورز (اختیاری)")}</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={addGroup}><Plus className="h-3 w-3 mr-1" /> {tr("Group", "گروپ")}</Button>
      </div>
      {(value || []).map((g, gi) => (
        <div key={g.id} className="border rounded-md p-2 bg-background space-y-2">
          <div className="flex gap-2 items-center">
            <Input aria-label={tr("Group name", "گروپ کا نام")} placeholder={tr("Group name (e.g. toppings)", "گروپ کا نام (مثلاً ٹاپنگ)")} value={g.name} onChange={(e) => updateGroup(gi, { name: e.target.value })} className="flex-1" />
            <Button type="button" size="sm" variant="ghost" aria-label={tr("Remove group", "گروپ ہٹائیں")} onClick={() => removeGroup(gi)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
          </div>
          <select
            className="w-full border rounded-md p-2 bg-background text-sm"
            aria-label={tr("Selection requirement", "انتخاب کی شرط")}
            value={presetOf(g)}
            onChange={(e) => updateGroup(gi, applyPreset(g, e.target.value as Preset))}
          >
            <option value="optional-many">{tr("Optional — multiple", "اختیاری — متعدد")}</option>
            <option value="optional-one">{tr("Optional — at most 1", "اختیاری — زیادہ سے زیادہ 1")}</option>
            <option value="required-one">{tr("Required — exactly 1", "لازمی — صرف 1")}</option>
            <option value="required-many">{tr("Required — at least 1", "لازمی — کم از کم 1")}</option>
          </select>
          <div className="space-y-1.5 pl-2 border-l-2 border-primary/30">
            {g.choices.map((c, ci) => (
              <div key={c.id} className="flex gap-2">
                <Input aria-label={tr("Choice name", "چوائس کا نام")} placeholder={tr("Choice (e.g. cheese)", "چوائس (مثلاً چیز)")} value={c.label} onChange={(e) => {
                  const choices = g.choices.map((x, idx) => idx === ci ? { ...x, label: e.target.value } : x);
                  updateGroup(gi, { choices });
                }} />
                <Input type="number" aria-label={tr("Extra price", "اضافی قیمت")} placeholder="+ / − Rs" value={c.price_delta || ""} onChange={(e) => {
                  const choices = g.choices.map((x, idx) => idx === ci ? { ...x, price_delta: Number(e.target.value) } : x);
                  updateGroup(gi, { choices });
                }} className="w-24" />
                <Button type="button" size="sm" variant="ghost" aria-label={tr("Remove choice", "چوائس ہٹائیں")} onClick={() => {
                  updateGroup(gi, { choices: g.choices.filter((_, idx) => idx !== ci) });
                }}><Trash2 className="h-3 w-3 text-destructive" /></Button>
              </div>
            ))}
            <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
              const choices = [...g.choices, { id: uid(), label: "", price_delta: 0 }];
              const grown = g.max >= g.choices.length ? { max: Math.max(choices.length, g.max) } : {};
              updateGroup(gi, { choices, ...grown });
            }}><Plus className="h-3 w-3 mr-1" /> {tr("Choice", "چوائس")}</Button>
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
