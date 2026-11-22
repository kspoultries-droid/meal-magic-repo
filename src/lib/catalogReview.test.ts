import { describe, expect, it } from "vitest";
import { barcodeConflict, nextReviewItem, normalizedCatalogBarcode } from "./catalogReview";

describe("evidence-driven catalog review", () => {
  it("rejects assigning another pack's barcode but permits an unchanged own barcode", () => {
    const items = [{ id: "250g", barcode: "4006381333931" }, { id: "500g", barcode: null }];
    expect(barcodeConflict(items, "4006381333931", "500g")).toBe(true);
    expect(barcodeConflict(items, "4006381333931", "250g")).toBe(false);
    expect(barcodeConflict(items, "", "500g")).toBe(false);
  });
  it("validates rather than inventing barcode evidence", () => {
    expect(normalizedCatalogBarcode(" 4006381333931 ")).toBe("4006381333931");
    expect(normalizedCatalogBarcode("")).toBeNull();
    expect(() => normalizedCatalogBarcode("4006381333932")).toThrow();
  });
  it("advances only to the next selected review row without changing verification", () => {
    const items = [{ id: "a", image_verified: false }, { id: "b", image_verified: false }];
    expect(nextReviewItem(items, "a")).toEqual({ id: "b", image_verified: false });
    expect(nextReviewItem(items, "b")).toBeNull();
    expect(nextReviewItem(items, "missing")).toBeNull();
    expect(items.every((i) => !i.image_verified)).toBe(true);
  });
});