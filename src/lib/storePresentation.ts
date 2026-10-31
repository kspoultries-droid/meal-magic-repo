export const storePath = (id: string, type?: string | null) =>
  `/${type === "wholesale" ? "bazar" : "grocery"}/${id}`;

export const mergeProductPhotos = (current: { image_url?: string | null; images?: unknown }, uploaded: string[]) => {
  const previous = Array.isArray(current.images) ? current.images.filter((url): url is string => typeof url === "string") : [];
  const images = [...new Set([...uploaded, ...(current.image_url ? [current.image_url] : []), ...previous])];
  return { image_url: uploaded[0] || current.image_url || null, images };
};