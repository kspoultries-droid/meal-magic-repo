// Standard specification fields per catalog category, so every vendor's listing shows the same facts.
export type SpecField = { key: string; label: string };

const T: Record<string, SpecField[]> = {
  mobile: [
    { key: "ram", label: "RAM" }, { key: "storage", label: "اسٹوریج" }, { key: "battery", label: "بیٹری (mAh)" },
    { key: "screen", label: "اسکرین" }, { key: "camera", label: "کیمرا" }, { key: "pta", label: "PTA منظور" }, { key: "warranty", label: "وارنٹی" },
  ],
  electronics: [
    { key: "model", label: "ماڈل" }, { key: "power", label: "پاور / واٹ" }, { key: "voltage", label: "وولٹیج" },
    { key: "battery", label: "بیٹری" }, { key: "in_box", label: "ڈبے میں کیا ہے" }, { key: "warranty", label: "وارنٹی" },
  ],
  clothes: [{ key: "fabric", label: "کپڑا" }, { key: "sizes", label: "سائز" }, { key: "colors", label: "رنگ" }, { key: "fit", label: "فٹنگ" }],
  shoes: [{ key: "material", label: "میٹیریل" }, { key: "sizes", label: "سائز" }, { key: "colors", label: "رنگ" }, { key: "sole", label: "سول" }],
  cosmetics: [{ key: "volume", label: "مقدار" }, { key: "skin", label: "جلد کی قسم" }, { key: "expiry", label: "میعاد" }, { key: "origin", label: "کہاں کا بنا" }],
  grocery: [{ key: "pack", label: "پیکنگ / وزن" }, { key: "ingredients", label: "اجزاء" }, { key: "origin", label: "کہاں کا بنا" }, { key: "shelf_life", label: "میعاد" }],
  fresh: [{ key: "grade", label: "معیار / گریڈ" }, { key: "sold_by", label: "کس حساب سے" }],
  general: [{ key: "model", label: "ماڈل" }, { key: "material", label: "میٹیریل" }, { key: "size", label: "سائز" }, { key: "warranty", label: "وارنٹی" }],
};

export const specTemplateFor = (category?: string | null): SpecField[] => {
  const c = String(category || "").toLowerCase();
  if (/mobile|tablet|phone/.test(c) && !/accessor/.test(c)) return T.mobile;
  if (/electr|electric|accessor|appliance/.test(c)) return T.electronics;
  if (/cloth|kapr|dress/.test(c)) return T.clothes;
  if (/shoe/.test(c)) return T.shoes;
  if (/cosmet|care|beauty/.test(c)) return T.cosmetics;
  if (/vegetable|fruit|meat|egg/.test(c)) return T.fresh;
  if (/hardware|tool|crockery|stationery|toy/.test(c)) return T.general;
  return T.grocery;
};

/** Builds the standard description shown to customers: base text + one line per filled spec. */
export const specsToText = (category: string | null | undefined, specs: Record<string, string> | null | undefined, base?: string | null) => {
  const lines = specTemplateFor(category)
    .filter((f) => String(specs?.[f.key] ?? "").trim())
    .map((f) => `${f.label}: ${String(specs![f.key]).trim()}`);
  return [String(base || "").trim(), ...lines].filter(Boolean).join("\n");
};
