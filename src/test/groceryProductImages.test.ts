import { describe, expect, it, vi } from "vitest";

const upload = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client", () => ({ supabase: { storage: { from: () => ({ upload, getPublicUrl: (path: string) => ({ data: { publicUrl: `https://example.test/${path}` } }) }) } } }));
import { productImagePath, uploadGroceryProductPhoto } from "@/lib/groceryProductImages";

describe("owner-scoped product images", () => {
  const id = "0aee0202-44c6-466c-a5a6-b74547b95afa";
  it("keeps the exact product UUID as the filename with a fresh folder per photo", () => {
    const file = new File(["photo"], "camera.png", { type: "image/png" });
    const first = productImagePath(id, file);
    expect(first).toMatch(new RegExp(`^products/[0-9a-f-]{36}/${id}\\.png$`));
    expect(productImagePath(id, file)).not.toBe(first);
  });
  it("inserts without requiring overwrite permissions", async () => {
    upload.mockResolvedValueOnce({ error: null });
    const file = new File(["photo"], "camera.webp", { type: "image/webp" });
    await uploadGroceryProductPhoto(id, file);
    expect(upload).toHaveBeenLastCalledWith(expect.stringContaining(`/${id}.webp`), file, { upsert: false, contentType: "image/webp" });
  });
  it("propagates rejected uploads rather than returning a false success URL", async () => {
    upload.mockResolvedValueOnce({ error: { message: "Access denied" } });
    await expect(uploadGroceryProductPhoto(id, new File(["photo"], "camera.jpg"))).rejects.toThrow("Access denied");
  });
});