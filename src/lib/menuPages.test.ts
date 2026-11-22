import { describe, expect, it } from "vitest";
import { menuPageLayout, validateMenuPages } from "./menuPages";

const file = { size: 1024, type: "image/jpeg" };
describe("multi-page menu input", () => {
  it("accepts 5 pages and rejects 6 without dropping any page", () => {
    expect(validateMenuPages(Array(5).fill(file))).toBeNull();
    expect(validateMenuPages(Array(6).fill(file))).toBe("pages");
  });
  it("rejects empty, non-image and over-10MB pages", () => {
    expect(validateMenuPages([{ ...file, size: 0 }])).toBe("type");
    expect(validateMenuPages([{ ...file, type: "application/pdf" }])).toBe("type");
    expect(validateMenuPages([{ ...file, size: 10 * 1024 * 1024 + 1 }])).toBe("size");
  });
  it("retains each of 5 portrait pages at readable resolution", () => {
    const result = menuPageLayout(Array(5).fill({ width: 1200, height: 1600 }));
    expect(result.width).toBe(1200);
    expect(result.height).toBe(8000);
    expect(result.pages).toHaveLength(5);
  });
  it("retains aspect ratio and rejects invalid geometry", () => {
    expect(menuPageLayout([{ width: 2400, height: 3200 }]).pages).toEqual([{ width: 1200, height: 1600 }]);
    expect(() => menuPageLayout([{ width: 0, height: 100 }])).toThrow();
  });
});