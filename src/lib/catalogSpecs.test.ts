import { describe, expect, it } from "vitest";
import { specTemplateFor, specsToText } from "./catalogSpecs";

describe("catalog specs", () => {
  it("mobiles get RAM and PTA fields", () => {
    const keys = specTemplateFor("Mobiles").map((f) => f.key);
    expect(keys).toContain("ram");
    expect(keys).toContain("pta");
  });
  it("mobile accessories use electronics fields, not phone fields", () => {
    expect(specTemplateFor("Mobile Accessories").map((f) => f.key)).not.toContain("ram");
  });
  it("only filled specs appear in the description", () => {
    expect(specsToText("Mobiles", { ram: "8GB", storage: "" }, "Samsung A15")).toBe("Samsung A15\nRAM: 8GB");
  });
});
