// Design (color) × size variants for clothes/shoes. Stored flat in grocery_products.variants
// so the server price check (base price + price_delta) stays authoritative.
export type MatrixDesign = { name: string; image?: string; price: number };
export type MatrixSize = { label: string; note?: string; extra: number };
export type FlatVariant = {
  id: string; label: string; color?: string; size?: string; size_note?: string; image?: string;
  price_delta: number; design_price?: number; size_extra?: number; is_available?: boolean;
};

export const SIZE_PRESETS: { key: string; en: string; ur: string; sizes: MatrixSize[] }[] = [
  { key: "baby", en: "Baby (months)", ur: "شیر خوار (ماہ)", sizes: [
    { label: "Newborn", note: "قد 50-56 cm", extra: 0 }, { label: "0-3 months", note: "قد 56-62 cm", extra: 0 },
    { label: "3-6 months", note: "قد 62-68 cm", extra: 0 }, { label: "6-12 months", note: "قد 68-80 cm", extra: 0 },
    { label: "12-18 months", note: "قد 80-86 cm", extra: 0 }, { label: "18-24 months", note: "قد 86-92 cm", extra: 0 } ] },
  { key: "kids", en: "Kids clothes (age + length)", ur: "بچوں کے کپڑے (عمر + لمبائی)", sizes: [
    { label: "1-2 yrs", note: "سائز 16 · قمیض 16 انچ", extra: 0 }, { label: "2-3 yrs", note: "سائز 18 · قمیض 18 انچ", extra: 0 },
    { label: "3-4 yrs", note: "سائز 20 · قمیض 20 انچ", extra: 0 }, { label: "4-5 yrs", note: "سائز 22 · قمیض 22 انچ", extra: 0 },
    { label: "5-6 yrs", note: "سائز 24 · قمیض 24 انچ", extra: 0 }, { label: "7-8 yrs", note: "سائز 26 · قمیض 26 انچ", extra: 0 },
    { label: "9-10 yrs", note: "سائز 28 · قمیض 28 انچ", extra: 0 }, { label: "11-12 yrs", note: "سائز 30 · قمیض 30 انچ", extra: 0 } ] },
  { key: "adult", en: "Adult clothes", ur: "بڑوں کے کپڑے", sizes: [
    { label: "S", note: "چھاتی 36 انچ", extra: 0 }, { label: "M", note: "چھاتی 38-40 انچ", extra: 0 },
    { label: "L", note: "چھاتی 42 انچ", extra: 0 }, { label: "XL", note: "چھاتی 44 انچ", extra: 0 }, { label: "XXL", note: "چھاتی 46 انچ", extra: 0 } ] },
  { key: "shoes", en: "Shoes (Pakistani/UK)", ur: "جوتے (پاکستانی/UK)", sizes: [5, 6, 7, 8, 9, 10, 11, 12].map((n) => ({ label: String(n), note: `EU ${n + 34}`, extra: 0 })) },
  { key: "eu", en: "Shoes (EU)", ur: "جوتے (EU)", sizes: [36, 37, 38, 39, 40, 41, 42, 43, 44, 45].map((n) => ({ label: `EU ${n}`, extra: 0 })) },
  { key: "kidshoes", en: "Kids shoes", ur: "بچوں کے جوتے", sizes: [
    { label: "0-6 months", note: "تلوا 11 cm", extra: 0 }, { label: "6-12 months", note: "تلوا 12.5 cm", extra: 0 },
    { label: "1-2 yrs", note: "تلوا 13.5 cm", extra: 0 }, { label: "2-3 yrs", note: "تلوا 15 cm", extra: 0 },
    { label: "3-4 yrs", note: "تلوا 16.5 cm", extra: 0 }, { label: "5-6 yrs", note: "تلوا 18 cm", extra: 0 },
    { label: "7-8 yrs", note: "تلوا 19.5 cm", extra: 0 }, { label: "9-10 yrs", note: "تلوا 21 cm", extra: 0 } ] },
];

const clean = (s: string) => s.trim().replace(/\|/g, "/");

export function buildMatrixVariants(designs: MatrixDesign[], sizes: MatrixSize[], basePrice: number): FlatVariant[] {
  const ds = designs.filter((d) => d.name.trim() && Number(d.price) > 0);
  const ss = sizes.filter((s) => s.label.trim());
  const out: FlatVariant[] = [];
  for (const d of ds) {
    const rows: (MatrixSize | null)[] = ss.length ? ss : [null];
    for (const s of rows) {
      const price = Number(d.price) + Number(s?.extra || 0);
      out.push({
        id: s ? `${clean(d.name)}|${clean(s.label)}` : clean(d.name),
        label: s ? `${d.name.trim()}, ${s.label.trim()}` : d.name.trim(),
        color: d.name.trim(), size: s?.label.trim(), size_note: s?.note?.trim() || undefined, image: d.image || undefined,
        price_delta: price - basePrice, design_price: Number(d.price), size_extra: Number(s?.extra || 0),
      });
    }
  }
  return out;
}

export function readMatrix(variants: unknown): { designs: MatrixDesign[]; sizes: MatrixSize[] } {
  const list = Array.isArray(variants) ? (variants as FlatVariant[]).filter((v) => v && v.color) : [];
  const designs = new Map<string, MatrixDesign>(); const sizes = new Map<string, MatrixSize>();
  for (const v of list) {
    if (!designs.has(v.color!)) designs.set(v.color!, { name: v.color!, image: v.image, price: Number(v.design_price ?? 0) });
    if (v.size && !sizes.has(v.size)) sizes.set(v.size, { label: v.size, note: v.size_note, extra: Number(v.size_extra ?? 0) });
  }
  return { designs: [...designs.values()], sizes: [...sizes.values()] };
}

export const isMatrix = (variants: unknown) => Array.isArray(variants) && variants.some((v: any) => v && (v.color || v.size));
