import { describe, it, expect } from "vitest";
import { matchesSearch } from "@/lib/searchMatch";
describe("typo tolerant search", () => {
  it("extra letter still finds", () => expect(matchesSearch("AAtta", "Atta 10kg")).toBe(true));
  it("missing letter still finds", () => expect(matchesSearch("Ata", "Atta 5kg")).toBe(true));
  it("misspelled long word", () => expect(matchesSearch("shuger", "Sugar 1kg")).toBe(true));
  it("unrelated does not match", () => expect(matchesSearch("Atta", "Creatine powder")).toBe(false));
});
