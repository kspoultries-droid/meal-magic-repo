import { validBarcode } from "./catalogOnboarding";

/** Local image decoding only; no recognition API or catalog writes. */
export async function readBarcode(file: File): Promise<string | null> {
  const Detector = (window as any).BarcodeDetector;
  if (Detector) {
    try {
      const bitmap = await createImageBitmap(file);
      try {
        const codes = await new Detector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"] }).detect(bitmap);
        const code = codes?.find((c: { rawValue?: string }) => c.rawValue && validBarcode(c.rawValue))?.rawValue;
        if (code) return code.trim();
      } finally { bitmap.close(); }
    } catch { /* Use portable image decoding below. */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const { BrowserMultiFormatReader } = await import("@zxing/browser");
    const code = (await new BrowserMultiFormatReader().decodeFromImageUrl(url)).getText();
    return validBarcode(code) ? code.trim() : null;
  } catch { return null; }
  finally { URL.revokeObjectURL(url); }
}