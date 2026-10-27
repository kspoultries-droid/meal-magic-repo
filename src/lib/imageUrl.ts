/**
 * Returns a smaller, compressed (WebP) version of an uploaded photo.
 * Storage photos are resized on the server; Unsplash photos via query params.
 * Other URLs are returned unchanged.
 */
export const img = (url: string | null | undefined, width = 480, quality = 70): string => {
  if (!url) return "";
  try {
    if (url.includes("/storage/v1/object/public/")) {
      const out = url.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/");
      const sep = out.includes("?") ? "&" : "?";
      return `${out}${sep}width=${width}&quality=${quality}`;
    }
    if (url.includes("images.unsplash.com")) {
      const u = new URL(url);
      u.searchParams.set("w", String(width));
      u.searchParams.set("fm", "webp");
      u.searchParams.set("q", String(quality));
      return u.toString();
    }
  } catch {
    /* fall through */
  }
  return url;
};
