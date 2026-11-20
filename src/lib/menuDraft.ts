/** Client validation only; prices and ownership remain server-authoritative. */
export const validateMenuDraft = (draft: { name: string; price: string }, restaurantId: string): "restaurant" | "name" | "price" | null => {
  if (!restaurantId) return "restaurant";
  if (!draft.name.trim()) return "name";
  const price = Number(draft.price);
  if (!draft.price.trim() || !Number.isFinite(price) || price <= 0) return "price";
  return null;
};