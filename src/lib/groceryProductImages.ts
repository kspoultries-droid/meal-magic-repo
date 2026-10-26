import { supabase } from "@/integrations/supabase/client";

export const productImagePath = (productId: string, file: File) => {
  const extensions: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/avif": "avif", "image/gif": "gif" };
  const extension = extensions[file.type] || file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  return `products/${crypto.randomUUID()}/${productId}.${extension}`;
};

export const uploadGroceryProductPhoto = async (productId: string, file: File) => {
  const path = productImagePath(productId, file);
  const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw new Error(error.message);
  return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
};