import { validBarcode } from "./catalogOnboarding";

export function barcodeConflict(items: { id?: string; barcode?: string | null }[], code: string, id?: string) {
  const clean = code.trim();
  return clean !== "" && items.some((item) => item.id !== id && item.barcode?.trim() === clean);
}

export function nextReviewItem<T extends { id?: string }>(queue: T[], id?: string): T | null {
  const index = queue.findIndex((item) => item.id === id);
  return index < 0 ? null : queue[index + 1] || null;
}

export function normalizedCatalogBarcode(code?: string | null): string | null {
  const clean = code?.trim() || "";
  if (clean && !validBarcode(clean)) throw new Error("Invalid barcode");
  return clean || null;
}