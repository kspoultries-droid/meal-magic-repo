export type PastLine = { id: string; name: string; quantity: number; variant_id?: string | null };
export type CurrentProduct = { id: string; name: string; price: number; discount_price?: number | null; is_available: boolean; image_url?: string | null; store_id: string; stock_quantity?: number | null; weight_kg?: number | null; weight?: string | null; unit?: string | null };

/** Rebuilds a past grocery order at today's prices; unavailable or variant lines are skipped (variant prices must be re-chosen). */
export const buildReorder = (lines: PastLine[], products: CurrentProduct[]) => {
  const byId = new Map(products.map((p) => [p.id, p]));
  const add: (CurrentProduct & { quantity: number; unitPrice: number })[] = [];
  const skipped: string[] = [];
  for (const l of lines) {
    const p = byId.get(l.id);
    if (!p || !p.is_available || l.variant_id || (p.stock_quantity != null && p.stock_quantity <= 0)) { skipped.push(l.name); continue; }
    const qty = p.stock_quantity != null ? Math.min(l.quantity, p.stock_quantity) : l.quantity;
    add.push({ ...p, quantity: qty, unitPrice: Number(p.discount_price || p.price) });
  }
  return { add, skipped };
};
