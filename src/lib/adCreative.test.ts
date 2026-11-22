import { describe, expect, it, vi } from "vitest";
import { adDiscount, prepareAdImage, validAdLink, verifyAdImage } from "./adCreative";

describe("ad creative safeguards", () => {
  it("derives discount without overstating the reduction", () => {
    expect(adDiscount(80, 100)).toBe("20% OFF");
    expect(adDiscount(200, 300)).toBe("33% OFF");
  });
  it("does not claim a discount for missing, invalid or unchanged amounts", () => {
    for (const [price, old] of [[0, 100], [100, 100], [101, 100], [80, 0], [NaN, 100]]) expect(adDiscount(price, old)).toBe("");
  });
  it("allows app destinations and HTTPS but not script or protocol-relative links", () => {
    expect(validAdLink("/restaurant/abc")).toBe(true);
    expect(validAdLink("/product/xyz")).toBe(true);
    expect(validAdLink("https://wa.me/923001234567")).toBe(true);
    for (const value of ["javascript:alert(1)", "//example.com", "/\\example.com", "http://example.com", "https://user:pass@example.com"]) expect(validAdLink(value)).toBe(false);
  });
  it("rejects unsupported files instead of saving an imageless ad", async () => {
    await expect(prepareAdImage(new File(["abc"], "x.svg", { type: "image/svg+xml" }))).rejects.toThrow();
  });
  it("rejects overlarge input before decoding", async () => {
    const file = new File(["x"], "x.png", { type: "image/png" });
    Object.defineProperty(file, "size", { value: 21 * 1024 * 1024 });
    await expect(prepareAdImage(file)).rejects.toThrow();
  });
  it("fails if the saved image cannot load", async () => {
    const OriginalImage = globalThis.Image;
    class BrokenImage { onerror?: () => void; set src(_value: string) { queueMicrotask(() => this.onerror?.()); } }
    vi.stubGlobal("Image", BrokenImage);
    try { await expect(verifyAdImage("https://example.com/missing.png")).rejects.toThrow(); }
    finally { vi.stubGlobal("Image", OriginalImage); }
  });
});