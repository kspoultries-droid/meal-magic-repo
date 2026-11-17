import { describe, it, expect } from "vitest";
import { restoredDeselection } from "@/contexts/CartContext";
describe("restored cart lanes", () => {
  it("ticks only the lane of the last added line", () => {
    const items: any[] = [
      { id: "w", source: "grocery", quantity: 1 },
      { id: "b", source: "restaurant", quantity: 1 },
    ];
    expect([...restoredDeselection(items)]).toEqual(["w"]);
  });
  it("single lane restores fully ticked", () => {
    expect(restoredDeselection([{ id: "w", source: "grocery", quantity: 1 } as any]).size).toBe(0);
  });
});
