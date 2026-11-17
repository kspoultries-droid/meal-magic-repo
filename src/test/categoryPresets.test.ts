import { describe, it, expect } from "vitest";
import * as L from "lucide-react";
import { CATEGORY_ICONS, CATEGORY_PRESETS, missingPresets } from "@/lib/categoryPresets";
describe("category presets", () => {
  it("every icon exists in lucide", () => {
    for (const i of [...CATEGORY_ICONS.map((x) => x.icon), ...CATEGORY_PRESETS.map((p) => p.icon)]) expect((L as any)[i], i).toBeTruthy();
  });
  it("20 presets", () => expect(CATEGORY_PRESETS.length).toBe(20));
  it("skips existing names regardless of case", () => {
    const m = missingPresets([{ name: "mobiles", kind: "item" }, { name: "Shoes", kind: "shop" }]);
    expect(m.find((p) => p.name === "Mobiles")).toBeUndefined();
    expect(m.find((p) => p.name === "Shoes")).toBeDefined();
  });
});
