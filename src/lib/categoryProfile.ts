// One category profile drives every product form: the variant dialog, the owner edit
// form and the add-product form all ask only for facts that category actually needs.
// Values live in grocery_products.specs (a JSON object), so no schema change is required.

import { SIZE_PRESETS, type MatrixSize } from "./variantMatrix";

export type ProfileKind = "shoes" | "clothes" | "tech" | "cosmetics" | "simple";

export type SectionField = {
  key: string;
  label: string;
  placeholder?: string;
  chips?: string[];
  legacy?: string[];
};

export type CategoryProfile = {
  kind: ProfileKind;
  /** Trigger-button wording for the variant dialog. */
  dialogLabel: { en: string; ur: string };
  /** Size preset keys from SIZE_PRESETS that fit this category. */
  presets: string[];
  /** Category-specific questions asked inside the variant dialog. */
  sectionFields: SectionField[];
  /** Extra single-line fields shown in the owner edit form. */
  editExtra: { key: string; label: string; placeholder?: string }[];
  /** Whether the sizes/colours part of the add-product form applies. */
  hasSizes: boolean;
  /** Whether the electronics specifications part applies. */
  isTech: boolean;
};

export const MATERIAL_KEY = "مواد / میٹیریل";

export const SHOES_PROFILE: CategoryProfile = {
  kind: "shoes",
  dialogLabel: { en: "Colours & sizes", ur: "رنگ اور سائز" },
  presets: ["shoes", "eu", "kidshoes"],
  sectionFields: [
    { key: "جوتے کی قسم", label: "جوتے کی قسم", chips: ["جوگر", "فارمل", "سینڈل", "چپل", "کھسہ", "بوٹس"] },
    { key: "مردانہ / زنانہ", label: "مردانہ / زنانہ", chips: ["مردانہ", "زنانہ", "بچگانہ", "یونیسکس"] },
    { key: MATERIAL_KEY, label: "میٹیریل", placeholder: "چمڑا، ریگزین، کینوس، میش", legacy: ["مواد"] },
  ],
  editExtra: [
    { key: "جوتے کی قسم", label: "جوتے کی قسم", placeholder: "جوگر، فارمل، سینڈل" },
    { key: MATERIAL_KEY, label: "میٹیریل", placeholder: "چمڑا، ریگزین، کینوس" },
  ],
  hasSizes: true,
  isTech: false,
};

export const CLOTHES_PROFILE: CategoryProfile = {
  kind: "clothes",
  dialogLabel: { en: "Designs, colours & sizes", ur: "ڈیزائن، رنگ اور سائز" },
  presets: ["baby", "kids", "adult"],
  sectionFields: [
    { key: "سوٹ کی قسم", label: "سوٹ کی قسم", chips: ["1-Piece", "2-Piece", "3-Piece"] },
    { key: "کپڑا / میٹریل", label: "کپڑا", placeholder: "لان، کاٹن، کھدر، سلک", legacy: ["fabric"] },
  ],
  editExtra: [
    { key: "سوٹ کی قسم", label: "سوٹ کی قسم", placeholder: "1-Piece، 2-Piece، 3-Piece" },
    { key: "کپڑا / میٹریل", label: "کپڑا", placeholder: "لان، کاٹن، کھدر" },
  ],
  hasSizes: true,
  isTech: false,
};

export const TECH_PROFILE: CategoryProfile = {
  kind: "tech",
  dialogLabel: { en: "Options & variants", ur: "قسم اور ویریئنٹ" },
  presets: [],
  sectionFields: [
    { key: "پاور (واٹ)", label: "پاور (واٹ)", placeholder: "e.g. 400W" },
    { key: "وارنٹی", label: "وارنٹی", placeholder: "e.g. 1 year" },
    { key: "وولٹیج", label: "وولٹیج", placeholder: "e.g. 220V" },
    { key: "اسٹوریج", label: "اسٹوریج", placeholder: "e.g. 64GB" },
  ],
  editExtra: [
    { key: "پاور (واٹ)", label: "پاور (مثلاً 400W)", placeholder: "400W" },
    { key: "وارنٹی", label: "وارنٹی (مثلاً 1 سال)", placeholder: "1 year" },
  ],
  hasSizes: false,
  isTech: true,
};

export const COSMETICS_PROFILE: CategoryProfile = {
  kind: "cosmetics",
  dialogLabel: { en: "Shades & sizes", ur: "شیڈ اور مقدار" },
  presets: [],
  sectionFields: [
    { key: "حجم / مقدار", label: "حجم / مقدار", placeholder: "30ml، 50ml، 100g" },
    { key: "جلد کی قسم", label: "جلد کی قسم", chips: ["خشک", "تیلدار", "مکس", "حساس"] },
    { key: MATERIAL_KEY, label: "مواد", placeholder: "اجزاء / بنیادی مواد" },
  ],
  editExtra: [
    { key: "حجم / مقدار", label: "حجم / مقدار", placeholder: "50ml" },
    { key: "جلد کی قسم", label: "جلد کی قسم", placeholder: "خشک، تیلدار" },
  ],
  hasSizes: false,
  isTech: false,
};

export const SIMPLE_PROFILE: CategoryProfile = {
  kind: "simple",
  dialogLabel: { en: "Pack sizes & options", ur: "پیک سائز اور قسم" },
  presets: [],
  sectionFields: [
    { key: "سائز / پیک", label: "سائز / پیک", placeholder: "1kg، 5kg، کارٹن" },
    { key: MATERIAL_KEY, label: "مواد", placeholder: "اسٹیل، پلاسٹک، لکڑی" },
  ],
  editExtra: [
    { key: "سائز / پیک", label: "سائز / پیک", placeholder: "1kg، 5kg، کارٹن" },
    { key: MATERIAL_KEY, label: "مواد", placeholder: "اسٹیل، پلاسٹک" },
  ],
  hasSizes: false,
  isTech: false,
};

export const HARDWARE_PROFILE: CategoryProfile = {
  kind: "simple",
  dialogLabel: { en: "Sizes & options", ur: "سائز اور قسم" },
  presets: [],
  sectionFields: [
    { key: "سائز / گیج", label: "سائز / گیج", placeholder: '1/2", 1", 16 gauge' },
    { key: MATERIAL_KEY, label: "مواد", placeholder: "اسٹیل، پلاسٹک، لکڑی" },
  ],
  editExtra: [
    { key: "سائز / گیج", label: "سائز / گیج", placeholder: '1/2", 1", 16 gauge' },
    { key: MATERIAL_KEY, label: "مواد", placeholder: "اسٹیل، پلاسٹک" },
  ],
  hasSizes: true,
  isTech: false,
};

export const AUTO_PROFILE: CategoryProfile = {
  kind: "simple",
  dialogLabel: { en: "Fits & options", ur: "لائن اور قسم" },
  presets: [],
  sectionFields: [
    { key: "گاڑی / ماڈل", label: "گاڑی / ماڈل", placeholder: "CD70, 125, Mehran" },
    { key: "سائز / نمبر", label: "سائز / نمبر", placeholder: "part number, inch" },
    { key: MATERIAL_KEY, label: "مواد", placeholder: "اسٹیل، ربڑ، پلاسٹک" },
  ],
  editExtra: [
    { key: "گاڑی / ماڈل", label: "گاڑی / ماڈل", placeholder: "CD70, 125, Mehran" },
    { key: MATERIAL_KEY, label: "مواد", placeholder: "اسٹیل، ربڑ" },
  ],
  hasSizes: true,
  isTech: false,
};

/** One predicate: every form asks the same profile what a category needs. */
export const categoryProfile = (category?: string | null): CategoryProfile => {
  const c = String(category || "").toLowerCase();
  if (/shoe|joota|chappal|sandal|footwear|sneaker/.test(c)) return SHOES_PROFILE;
  if (/cloth|garment|dress|lawn|suit|fashion|kapr|kaprr|stitch/.test(c)) return CLOTHES_PROFILE;  if (/cosmet|beauty|skin|makeup|perfume|care|medical store/.test(c)) return COSMETICS_PROFILE;
  if (/auto|part|bike|car|scooter|motorcycle/.test(c)) return AUTO_PROFILE;
  if (/hardware|tool|iron|sanitary|wire|cable|fitting|pipe|paint/.test(c)) return HARDWARE_PROFILE;
  if (/electr|electric|mobile|appliance|computer|laptop|tv|watch/.test(c)) return TECH_PROFILE;
  return SIMPLE_PROFILE;
};

/** Size presets that fit the category; empty means "no ready-made size lists". */
export const sizePresetsFor = (profile: CategoryProfile) =>
  SIZE_PRESETS.filter((p) => profile.presets.includes(p.key));

/** Copy section values into the specs object, dropping empty answers and legacy keys. */
export const applySectionFields = (
  specs: Record<string, unknown>,
  profile: CategoryProfile,
  values: Record<string, string>,
): Record<string, unknown> => {
  const next: Record<string, unknown> = { ...specs };
  for (const f of profile.sectionFields) {
    const v = String(values[f.key] ?? "").trim();
    if (v) next[f.key] = v; else delete next[f.key];
    for (const old of f.legacy || []) delete next[old];
  }
  return next;
};

/** Edit-form rows for the product: fixed identity fields plus the category's own fields. */
export const extraFields = (
  profile: CategoryProfile,
  specs: Record<string, unknown>,
): { key: string; label: string; placeholder?: string; value: string }[] =>
  profile.editExtra.map((f) => ({ ...f, value: String(specs[f.key] ?? "") }));
