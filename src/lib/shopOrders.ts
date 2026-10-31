export function availableShopQuantity(product: { stock_qty?: number | null; is_available?: boolean }, variant?: { stock_qty?: number | null; is_available?: boolean } | null) {
  if (product.is_available === false || variant?.is_available === false) return 0;
  const values = [product.stock_qty, variant?.stock_qty].filter((v): v is number => v != null && Number.isFinite(Number(v))).map(Number);
  return values.length ? Math.max(0, Math.min(...values)) : null;
}
export function shopCustomerTotal(subtotal: number, discount: number, deliveryFee: number, payer: string) {
  return Math.max(0, subtotal - discount + (payer === "vendor" ? 0 : deliveryFee));
}
export function shopStatusStep(status: string, stage?: string | null) {
  if (["completed", "delivered"].includes(status)) return 4;
  if (["picked_up", "arrived_customer"].includes(stage || "") || ["delivering", "out_for_delivery"].includes(status)) return 3;
  if (["picking", "preparing", "packed", "ready", "ready_for_pickup"].includes(status)) return 2;
  return status === "confirmed" ? 1 : 0;
}