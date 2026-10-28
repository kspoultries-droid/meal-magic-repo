// Shared helpers for shop owners' bulk item import/export (CSV or Excel rows).
export const INVENTORY_HEADERS = ["id", "name", "price", "discount_price", "unit", "category", "stock_qty", "available", "image_url"] as const;

export type ImportedProduct = {
  id: string;
  store_id: string;
  name: string;
  price: number;
  discount_price: number | null;
  is_special_offer: boolean;
  unit: string | null;
  category: string;
  stock_qty: number | null;
  is_available: boolean;
  image_url: string | null;
};

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const n = Number(String(v).replace(/[,\sRs.]+(?=\d)|,/gi, "").replace(/^rs/i, "").trim());
  return Number.isFinite(n) ? n : null;
};
const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const yes = (v: unknown) => !/^(0|no|false|nahi|nhi|نہیں|ختم|out)$/i.test(String(v ?? "").trim());

export function rowsToProducts(rows: unknown[][], storeId: string, newId: () => string = () => crypto.randomUUID()) {
  const errors: string[] = [];
  const products: ImportedProduct[] = [];
  if (rows.length < 2) return { products, errors: ["فائل میں کوئی چیز نہیں ملی"] };
  const header = rows[0].map((h) => String(h ?? "").trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  if (col("name") < 0 || col("price") < 0) return { products, errors: ["پہلی لائن میں name اور price کالم ضروری ہیں"] };
  const get = (r: unknown[], name: string) => (col(name) >= 0 ? r[col(name)] : undefined);
  rows.slice(1).forEach((r, i) => {
    const line = i + 2;
    const name = String(get(r, "name") ?? "").trim();
    const price = num(get(r, "price"));
    if (!name) return;
    if (price === null || price <= 0) { errors.push(`لائن ${line}: «${name}» کی قیمت درست نہیں`); return; }
    let discount = num(get(r, "discount_price"));
    if (discount !== null && (discount <= 0 || discount >= price)) discount = null;
    const rawId = String(get(r, "id") ?? "").trim();
    const availRaw = get(r, "available");
    products.push({
      id: isUuid(rawId) ? rawId : newId(),
      store_id: storeId,
      name,
      price,
      discount_price: discount,
      is_special_offer: discount !== null,
      unit: String(get(r, "unit") ?? "").trim() || null,
      category: String(get(r, "category") ?? "").trim() || "General",
      stock_qty: num(get(r, "stock_qty")),
      is_available: availRaw === undefined || String(availRaw).trim() === "" ? true : yes(availRaw),
      image_url: String(get(r, "image_url") ?? "").trim() || null,
    });
  });
  return { products, errors };
}

const esc = (v: unknown) => {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function productsToCsv(products: any[]) {
  const lines = [INVENTORY_HEADERS.join(",")];
  for (const p of products) {
    lines.push([p.id, p.name, p.price, p.discount_price ?? "", p.unit ?? "", p.category ?? "", p.stock_qty ?? "", p.is_available === false ? "no" : "yes", p.image_url ?? ""].map(esc).join(","));
  }
  return "\uFEFF" + lines.join("\r\n");
}
