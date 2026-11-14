import { describe, it, expect } from "vitest";
import { buildMatrixVariants, readMatrix } from "../variantMatrix";

describe("design × size pricing", () => {
  const designs = [{ name: "Rose Gold", price: 1699 }, { name: "Maroon", price: 1499 }];
  const sizes = [{ label: "Newborn", extra: 0 }, { label: "5 yrs", extra: 500 }, { label: "10 yrs", extra: 1000 }];
  const v = buildMatrixVariants(designs, sizes, 1399);
  const price = (label: string) => 1399 + v.find((x) => x.label === label)!.price_delta;

  it("each design has its own price", () => {
    expect(price("Rose Gold, Newborn")).toBe(1699);
    expect(price("Maroon, Newborn")).toBe(1499);
  });
  it("bigger size adds its own amount", () => {
    expect(price("Rose Gold, 5 yrs")).toBe(2199);
    expect(price("Rose Gold, 10 yrs")).toBe(2699);
  });
  it("one product holds every design and size", () => {
    expect(v).toHaveLength(6);
    expect(readMatrix(v).designs.map((d) => d.price)).toEqual([1699, 1499]);
  });
});
