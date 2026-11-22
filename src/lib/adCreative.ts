import { tr } from "@/lib/i18n/tr";
import { copyFile, loadImage } from "@/lib/imageEnhance";

export interface AdSelection {
  id: string;
  name: string;
  brand: string;
  image: string | null;
  link: string;
  price: number | null;
  originalPrice: number | null;
  placement: string;
}

export function adDiscount(price: string | number, original: string | number): string {
  const current = Number(price), previous = Number(original);
  if (!Number.isFinite(current) || !Number.isFinite(previous) || current <= 0 || previous <= current) return "";
  return `${Math.floor((previous - current) * 100 / previous)}% OFF`;
}

export function validAdLink(link: string): boolean {
  if (!link.trim()) return true;
  if (/^\/(?!\/)[^\s\\]*$/.test(link)) return true;
  try { const url = new URL(link); return url.protocol === "https:" && !url.username && !url.password; } catch { return false; }
}

export async function verifyAdImage(url: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const image = new Image();
    const timer = setTimeout(() => reject(new Error(tr("Image could not be loaded", "تصویر کھل نہیں سکی"))), 15000);
    image.onload = () => { clearTimeout(timer); resolve(); };
    image.onerror = () => { clearTimeout(timer); reject(new Error(tr("Image could not be loaded", "تصویر کھل نہیں سکی"))); };
    image.src = url;
  });
}

/** Produce the same 2:1 creative for preview and storage, without altering business photos. */
export async function prepareAdImage(source: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(source.type)) throw new Error(tr("Choose a JPG, PNG or WebP image", "JPG، PNG یا WebP تصویر منتخب کریں"));
  if (source.size > 20 * 1024 * 1024) throw new Error(tr("Image must be under 20 MB", "تصویر 20 MB سے کم ہو"));
  const image = await loadImage(await copyFile(source));
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1200; canvas.height = 600;
    const context = canvas.getContext("2d");
    if (!context) throw new Error(tr("Image preparation failed", "تصویر تیار نہیں ہو سکی"));
    const width = Math.min(image.width, image.height * 2), height = width / 2;
    context.drawImage(image, (image.width - width) / 2, (image.height - height) / 2, width, height, 0, 0, 1200, 600);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error(tr("Image preparation failed", "تصویر تیار نہیں ہو سکی"))), "image/webp", 0.8));
    return new File([blob], `ad.${blob.type === "image/webp" ? "webp" : "png"}`, { type: blob.type });
  } finally { if ("close" in image) image.close(); }
}