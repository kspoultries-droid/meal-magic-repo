export const CATEGORY_ICONS: { icon: string; en: string; ur: string }[] = [
  { icon: "Package", en: "General", ur: "عام" }, { icon: "ShoppingBag", en: "Shopping", ur: "شاپنگ" },
  { icon: "ShoppingBasket", en: "Kirana", ur: "کریانہ" }, { icon: "Store", en: "Store", ur: "اسٹور" },
  { icon: "Smartphone", en: "Mobile", ur: "موبائل" }, { icon: "Headphones", en: "Headphones", ur: "ہیڈفون" },
  { icon: "Laptop", en: "Laptop", ur: "لیپ ٹاپ" }, { icon: "Tablet", en: "Tablet", ur: "ٹیبلٹ" },
  { icon: "Cpu", en: "Electronics", ur: "الیکٹرانکس" }, { icon: "Tv", en: "TV", ur: "ٹی وی" },
  { icon: "Camera", en: "Camera", ur: "کیمرہ" }, { icon: "Gamepad2", en: "Games", ur: "گیمز" },
  { icon: "Watch", en: "Watches", ur: "گھڑیاں" }, { icon: "Shirt", en: "Clothes", ur: "کپڑے" },
  { icon: "Footprints", en: "Shoes", ur: "جوتے" }, { icon: "Gem", en: "Jewellery", ur: "زیورات" },
  { icon: "Glasses", en: "Glasses", ur: "چشمے" }, { icon: "Sparkles", en: "Beauty", ur: "بیوٹی" },
  { icon: "Baby", en: "Baby", ur: "بچے" }, { icon: "ToyBrick", en: "Toys", ur: "کھلونے" },
  { icon: "HeartPulse", en: "Health", ur: "صحت" }, { icon: "Pill", en: "Medicine", ur: "دوائی" },
  { icon: "Utensils", en: "Crockery", ur: "کراکری" }, { icon: "CookingPot", en: "Kitchen", ur: "کچن" },
  { icon: "Sofa", en: "Furniture", ur: "فرنیچر" }, { icon: "Lamp", en: "Lights", ur: "لائٹس" },
  { icon: "Zap", en: "Electric", ur: "بجلی" }, { icon: "Wrench", en: "Hardware", ur: "ہارڈویئر" },
  { icon: "Hammer", en: "Iron/Tools", ur: "اوزار" }, { icon: "Car", en: "Auto", ur: "گاڑی" },
  { icon: "Bike", en: "Bike", ur: "بائیک" }, { icon: "PencilRuler", en: "Stationery", ur: "اسٹیشنری" },
  { icon: "BookOpen", en: "Books", ur: "کتابیں" }, { icon: "Dumbbell", en: "Sports", ur: "کھیل" },
  { icon: "Wheat", en: "Pansaar", ur: "پنساری" }, { icon: "Gift", en: "Gifts", ur: "تحائف" },
  { icon: "PawPrint", en: "Pets", ur: "پالتو" }, { icon: "Sprout", en: "Garden", ur: "باغبانی" },
  { icon: "Briefcase", en: "Bags", ur: "بیگ" }, { icon: "Bath", en: "Bath", ur: "باتھ" },
];

export type CategoryPreset = { name: string; name_ur: string; icon: string; kind: "item" | "shop" };
export const CATEGORY_PRESETS: CategoryPreset[] = [
  ["Mobiles", "موبائل", "Smartphone"], ["Mobile Accessories", "موبائل اسیسریز", "Headphones"],
  ["Laptops", "لیپ ٹاپ", "Laptop"], ["Electronics", "الیکٹرانکس", "Cpu"], ["TV & Home Appliances", "ٹی وی اور گھریلو آلات", "Tv"],
  ["Watches", "گھڑیاں", "Watch"], ["Men Clothes", "مردانہ کپڑے", "Shirt"], ["Ladies Clothes", "زنانہ کپڑے", "Shirt"],
  ["Children Clothes", "بچوں کے کپڑے", "Baby"], ["Shoes", "جوتے", "Footprints"], ["Jewellery", "زیورات", "Gem"],
  ["Beauty & Cosmetics", "بیوٹی اور کاسمیٹکس", "Sparkles"], ["Health", "صحت", "HeartPulse"], ["Toys", "کھلونے", "ToyBrick"],
  ["Home & Kitchen", "گھر اور کچن", "CookingPot"], ["Furniture", "فرنیچر", "Sofa"], ["Hardware & Tools", "ہارڈویئر اور اوزار", "Hammer"],
  ["Stationery", "اسٹیشنری", "PencilRuler"], ["Sports & Fitness", "کھیل اور فٹنس", "Dumbbell"], ["Bags", "بیگ", "Briefcase"],
].map(([name, name_ur, icon]) => ({ name, name_ur, icon, kind: "item" as const }));

/** Presets not already present (case-insensitive name within same kind). */
export function missingPresets(existing: { name: string; kind?: string | null }[], presets = CATEGORY_PRESETS) {
  const have = new Set(existing.map((c) => `${c.kind ?? "item"}|${c.name.trim().toLowerCase()}`));
  return presets.filter((p) => !have.has(`${p.kind}|${p.name.toLowerCase()}`));
}
