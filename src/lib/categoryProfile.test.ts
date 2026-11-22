import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  applySectionFields, categoryProfile, extraFields, sizePresetsFor,
  AUTO_PROFILE, CLOTHES_PROFILE, COSMETICS_PROFILE, HARDWARE_PROFILE, SHOES_PROFILE, SIMPLE_PROFILE, TECH_PROFILE,
} from "./categoryProfile";

const specsOf = (p: any) => (p?.specs && typeof p.specs === "object" && !Array.isArray(p.specs)) ? p.specs : {};

describe("category profiles", () => {
  it("shoes are never asked for a suit type or fabric", () => {
    const p = categoryProfile("Shoes");
    expect(p).toBe(SHOES_PROFILE);
    expect(p.sectionFields.map((f) => f.key)).not.toContain("سوٹ کی قسم");
    expect(p.sectionFields.map((f) => f.key)).not.toContain("کپڑا / میٹریل");
  });

  it("shoes offer only shoe size lists", () => {
    const keys = sizePresetsFor(SHOES_PROFILE).map((x) => x.key);
    expect(keys).toEqual(["shoes", "eu", "kidshoes"]);
    expect(keys).not.toContain("adult");
  });

  it("the shoe edit form does not ask for power or warranty", () => {
    const keys = SHOES_PROFILE.editExtra.map((f) => f.key);
    expect(keys).not.toContain("پاور (واٹ)");
    expect(keys).not.toContain("وارنٹی");
  });

  it("clothes keep their suit type and fabric questions", () => {
    const p = categoryProfile("Cloth Market");
    expect(p).toBe(CLOTHES_PROFILE);
    const keys = p.sectionFields.map((f) => f.key);
    expect(keys).toContain("سوٹ کی قسم");
    expect(keys).toContain("کپڑا / میٹریل");
    expect(sizePresetsFor(p).map((x) => x.key)).toContain("adult");
  });

  it("clothes never get the shoe EU size list", () => {
    const keys = sizePresetsFor(CLOTHES_PROFILE).map((x) => x.key);
    expect(keys).not.toContain("eu");
    expect(keys).not.toContain("kidshoes");
  });

  it("electronics keep power and warranty", () => {
    const p = categoryProfile("Electronics");
    expect(p).toBe(TECH_PROFILE);
    const keys = p.editExtra.map((f) => f.key);
    expect(keys).toContain("پاور (واٹ)");
    expect(keys).toContain("وارنٹی");
  });

  it("cosmetics are asked for volume and skin type", () => {
    const p = categoryProfile("Cosmetics");
    expect(p).toBe(COSMETICS_PROFILE);
    const keys = p.sectionFields.map((f) => f.key);
    expect(keys).toContain("حجم / مقدار");
    expect(keys).toContain("جلد کی قسم");
  });

  it("kirana asks for pack size and material only", () => {
    expect(categoryProfile("Kirana")).toBe(SIMPLE_PROFILE);
    const keys = SIMPLE_PROFILE.sectionFields.map((f) => f.key);
    expect(keys).toContain("سائز / پیک");
    expect(keys).not.toContain("سوٹ کی قسم");
    expect(keys).not.toContain("پاور (واٹ)");
  });

  it("hardware asks for gauge and material, never a suit type", () => {
    expect(categoryProfile("Hardware")).toBe(HARDWARE_PROFILE);
    const keys = HARDWARE_PROFILE.sectionFields.map((f) => f.key);
    expect(keys).toContain("سائز / گیج");
    expect(keys).not.toContain("سوٹ کی قسم");
    expect(keys).not.toContain("پاور (واٹ)");
  });

  it("auto parts ask which vehicle the item fits", () => {
    expect(categoryProfile("Auto Parts")).toBe(AUTO_PROFILE);
    expect(AUTO_PROFILE.sectionFields.map((f) => f.key)).toContain("گاڑی / ماڈل");
  });

  it("shoes store material under the shared key and drop the old one", () => {
    const next = applySectionFields(
      { مواد: "پلاسٹک", "برائے مہربانی": "مت چھیڑیں" },
      SHOES_PROFILE,
      { "جوتے کی قسم": "جوگر", "مردانہ / زنانہ": "", "مواد / میٹیریل": "چمڑا" },
    );
    expect(next["مواد / میٹیریل"]).toBe("چمڑا");
    expect(next["مواد"]).toBeUndefined();
    expect(next["جوتے کی قسم"]).toBe("جوگر");
    expect(next["مردانہ / زنانہ"]).toBeUndefined();
    expect(next["برائے مہربانی"]).toBe("مت چھیڑیں");
  });

  it("the edit form prefills only the category's own answers", () => {
    const rows = extraFields(SHOES_PROFILE, { "جوتے کی قسم": "جوگر", "پاور (واٹ)": "400W" });
    expect(rows.map((r) => r.key)).toEqual(["جوتے کی قسم", "مواد / میٹیریل"]);
    expect(rows[0].value).toBe("جوگر");
    expect(rows[1].value).toBe("");
  });
});

describe("bazar product card badge", () => {
  it("never shows a '1 piece available' claim", () => {
    const src = readFileSync("src/components/wholesale/BazarProductCard.tsx", "utf8");
    expect(src).not.toContain("1 piece available");
  });
});
