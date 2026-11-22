export type CatalogIdentity = { id?: string; name?: string; unit?: string | null; barcode?: string | null; catalog_item_id?: string | null };
const normalize = (value?: string | null) => (value || "").normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");

export function sameCatalogProduct(a: CatalogIdentity, b: CatalogIdentity) {
  if (a.catalog_item_id && a.catalog_item_id === (b.catalog_item_id || b.id)) return true;
  if (b.catalog_item_id && b.catalog_item_id === a.id) return true;
  if (a.barcode && b.barcode && normalize(a.barcode) === normalize(b.barcode)) return true;
  return !!normalize(a.name) && normalize(a.name) === normalize(b.name) && normalize(a.unit) === normalize(b.unit);
}

export function uniqueCatalogItems<T extends CatalogIdentity>(items: T[], existing: CatalogIdentity[] = []) {
  const result: T[] = [];
  for (const item of items) {
    if (!existing.some((p) => sameCatalogProduct(p, item)) && !result.some((p) => sameCatalogProduct(p, item))) result.push(item);
  }
  return result;
}

export function catalogImages(item: { image_verified?: boolean; images?: string[]; image_url?: string | null }) {
  if (!item.image_verified) return [];
  return (item.images?.length ? item.images : item.image_url ? [item.image_url] : []).filter(Boolean).slice(0, 8);
}

export function validBarcode(value: string) {
  const code = value.trim();
  if (!/^\d{6,32}$/.test(code)) return false;
  if (![8, 12, 13, 14].includes(code.length)) return true; // Internal numeric codes are also supported.
  const digits = code.split("").map(Number);
  const sum = digits.slice(0, -1).reverse().reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - sum % 10) % 10 === digits[digits.length - 1];
}

export function validItemNumbers(price: string, discount: string, stock: string) {
  const p = Number(price), d = Number(discount), s = Number(stock);
  return price.trim() !== "" && Number.isFinite(p) && p > 0 &&
    (discount.trim() === "" || Number.isFinite(d) && d > 0 && d < p) &&
    (stock.trim() === "" || Number.isInteger(s) && s >= 0);
}

export const fitsShopCapacity = (existing: number, added: number) => existing >= 0 && added >= 0 && existing + added <= 1000;

const groceryCategories = new Set(["general", "eggs & meat", "vegetables", "snacks", "atta & rice", "fruits", "dairy", "personal care", "cleaning", "tea", "daal", "biscuits", "rice", "atta", "beverages", "chocolates", "sugar", "salt", "masala", "besan", "noodles", "oil", "bakery", "frozen", "care"]);
export const GROCERY_CATALOG_CATEGORIES = groceryCategories;
export const catalogFitsMode = (category: string | null | undefined, mode: "grocery" | "bazar") =>
  normalize(category) === "medicine" || groceryCategories.has(normalize(category || "general")) === (mode === "grocery");

export function starterPack<T extends CatalogIdentity & { category?: string | null }>(items: T[], existing: CatalogIdentity[], category?: string | null) {
  const raw = normalize(category);
  const aliases: Record<string, string[]> = { meat: ["eggs & meat"], kirana: ["general"], "departmental store": ["general"] };
  const selected = aliases[raw] || [raw];
  return uniqueCatalogItems(items.filter((i) => catalogFitsMode(i.category, "grocery") &&
    (!raw || selected.includes("general") || selected.includes(normalize(i.category)))), existing).slice(0, 100);
}