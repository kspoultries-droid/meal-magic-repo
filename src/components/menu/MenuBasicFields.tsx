import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { tr } from "@/lib/i18n/tr";

export type MenuBasicDraft = { name: string; description: string; price: string; unit: string; category: string; image_url: string };

const suggestions = [
  ["Pizza", "پیزا"], ["Cakes", "کیک"], ["Pastries", "پیسٹری"],
  ["Bread", "بریڈ"], ["Biscuits", "بسکٹ"], ["Savouries", "نمکین اشیا"],
  ["Sweets", "مٹھائیاں"], ["Beverages", "مشروبات"], ["Burgers", "برگر"],
  ["Biryani & Rice", "بریانی اور چاول"], ["BBQ", "باربی کیو"], ["Main", "دیگر کھانے"],
];

export default function MenuBasicFields({ value, onChange }: { value: MenuBasicDraft; onChange: (value: MenuBasicDraft) => void }) {
  const id = useId();
  const field = (key: keyof MenuBasicDraft, next: string) => onChange({ ...value, [key]: next });
  return <div className="space-y-3">
    <div className="space-y-1">
      <label htmlFor={`${id}-name`} className="text-sm font-medium">{tr("Item name", "آئٹم کا نام")}</label>
      <Input id={`${id}-name`} value={value.name} onChange={e => field("name", e.target.value)} />
    </div>
    <div className="space-y-1">
      <label htmlFor={`${id}-description`} className="text-sm font-medium">{tr("Description / ingredients", "تفصیل / اجزاء")}</label>
      <Textarea id={`${id}-description`} value={value.description} onChange={e => field("description", e.target.value)} />
    </div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="space-y-1">
        <label htmlFor={`${id}-price`} className="text-sm font-medium">{tr("Price (Rs)", "قیمت (Rs)")}</label>
        <Input id={`${id}-price`} type="number" min="0.01" step="any" inputMode="decimal" value={value.price} onChange={e => field("price", e.target.value)} />
      </div>
      <div className="space-y-1">
        <label htmlFor={`${id}-unit`} className="text-sm font-medium">{tr("Size / serving", "سائز / مقدار")}</label>
        <Input id={`${id}-unit`} placeholder={tr('e.g. 12 inch, 2 lb, 1 piece', 'مثلاً 12 انچ، 2 پاؤنڈ، 1 عدد')} value={value.unit} onChange={e => field("unit", e.target.value)} />
      </div>
    </div>
    <div className="space-y-1">
      <label htmlFor={`${id}-category`} className="text-sm font-medium">{tr("Food category", "کھانے کا زمرہ")}</label>
      <Input id={`${id}-category`} list={`${id}-categories`} value={value.category} onChange={e => field("category", e.target.value)} />
      <datalist id={`${id}-categories`}>{suggestions.map(([en, ur]) => <option key={en} value={en}>{tr(en, ur)}</option>)}</datalist>
    </div>
  </div>;
}