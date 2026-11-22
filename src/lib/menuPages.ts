export const MAX_MENU_PAGES = 5;
export const MAX_MENU_FILE_BYTES = 10 * 1024 * 1024;

export function validateMenuPages(files: Pick<File, "size" | "type">[], maximum = MAX_MENU_PAGES): string | null {
  if (files.length > maximum) return "pages";
  if (files.some(file => !file.type.startsWith("image/") || file.size === 0)) return "type";
  if (files.some(file => file.size > MAX_MENU_FILE_BYTES)) return "size";
  return null;
}

export function menuPageLayout(sizes: { width: number; height: number }[]) {
  const pages = sizes.map(size => {
    if (size.width <= 0 || size.height <= 0) throw new Error("Invalid page dimensions");
    const scale = Math.min(1, 1600 / Math.max(size.width, size.height));
    return { width: Math.max(1, Math.round(size.width * scale)), height: Math.max(1, Math.round(size.height * scale)) };
  });
  return { pages, width: Math.max(1, ...pages.map(page => page.width)), height: pages.reduce((sum, page) => sum + page.height, 0) };
}

// Combine locally rather than changing the frozen single-image server contract.
export async function prepareMenuPages(files: File[]): Promise<string> {
  if (!files.length || validateMenuPages(files)) throw new Error("Invalid menu pages");
  const images: HTMLImageElement[] = [];
  for (const file of files) {
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Could not read image"));
        image.src = url;
      });
      images.push(image);
    } finally { URL.revokeObjectURL(url); }
  }
  const layout = menuPageLayout(images.map(image => ({ width: image.naturalWidth, height: image.naturalHeight })));
  const canvas = document.createElement("canvas");
  canvas.width = layout.width;
  canvas.height = layout.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare image");
  context.fillStyle = "white"; // Paper raster, not a themed UI surface.
  context.fillRect(0, 0, canvas.width, canvas.height);
  let y = 0;
  images.forEach((image, index) => {
    const page = layout.pages[index];
    context.drawImage(image, 0, y, page.width, page.height);
    y += page.height;
  });
  const result = canvas.toDataURL("image/jpeg", 0.88);
  if (result.length > 6_000_000) throw new Error("Prepared image too large");
  return result;
}