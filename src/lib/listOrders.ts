export const MAX_LIST_PHOTOS = 4;
export const listPhotos = (order: { image_url?: string; image_urls?: string[] }) =>
  order.image_urls?.length ? order.image_urls : order.image_url ? [order.image_url] : [];
export const canAcceptListQuote = (order: { status: string; total_amount: number }) =>
  order.status === "quoted" && Number(order.total_amount) > 0;
export const validListPin = (lat?: number | null, lng?: number | null) =>
  lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
export type ListPrinter = "a4" | "usb80" | "bluetooth80";
export const printerPaperWidth = (printer: ListPrinter) => printer === "a4" ? "210mm" : "80mm";