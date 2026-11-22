export const GROCERY_CATEGORY_ALIASES: Record<string, string[]> = {
  "Eggs & Meat": ["Eggs & Meat", "Meat"], Cake: ["Cake", "Bakery"],
  "Atta & Rice": ["Atta & Rice", "Atta"], General: ["General", "Kirana", "Departmental Store"],
  Gift: ["Gift", "Gifts"],
};

export const groceryCategoryNames = (category: string | null) => category ? GROCERY_CATEGORY_ALIASES[category] || [category] : [];

/** Discovery only: never substitutes for checkout's stock, price or delivery validation. */
export function discoverGroceryProducts<T extends { store_id: string; category?: string | null }>(products: T[], storeIds: Set<string>, category: string | null): T[] {
  const names = groceryCategoryNames(category);
  return products.filter(p => storeIds.has(p.store_id) && (!category || names.includes(p.category || "")));
}