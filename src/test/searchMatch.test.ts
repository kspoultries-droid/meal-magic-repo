import { describe, it, expect } from "vitest";
import { matchesSearch } from "@/lib/searchMatch";

describe("cross-script search", () => {
  it("finds Urdu shop by English spelling", () => {
    expect(matchesSearch("Shaheen cloth house", "شاہین کلاتھ ہاؤس")).toBe(true);
    expect(matchesSearch("shahin", "شاہین کلاتھ ہاؤس")).toBe(true);
  });
  it("finds Urdu items by English spelling", () => {
    expect(matchesSearch("mobile", "موبائل زون ہول سیل")).toBe(true);
    expect(matchesSearch("hardware", "رحیم ہارڈویئر اسٹور")).toBe(true);
  });
  it("does not match unrelated names", () => {
    expect(matchesSearch("shoes", "شاہین کلاتھ ہاؤس")).toBe(false);
  });
  it("still matches plain text", () => {
    expect(matchesSearch("alfa", "Alfalah electronics")).toBe(true);
  });
});
