export type ViewedProduct = { id: string; name: string; image_url: string | null; price: number; discount_price?: number | null; wholesale_price?: number | null };
export const recentKey = (userId?: string) => `easylife:recent:${userId || "guest"}`;
export function readRecent(userId?: string): ViewedProduct[] {
  try { return JSON.parse(localStorage.getItem(recentKey(userId)) || "[]"); } catch { return []; }
}
export function recordRecent(product: ViewedProduct, userId?: string) {
  const list = [product, ...readRecent(userId).filter(p => p.id !== product.id)].slice(0, 20);
  try { localStorage.setItem(recentKey(userId), JSON.stringify(list)); } catch { /* storage unavailable */ }
  return list;
}