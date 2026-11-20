import { describe, it, expect } from "vitest";
import { restaurantSaveErrorMessage } from "./restaurantSaveError";

describe("restaurantSaveErrorMessage", () => {
  it("never reports the broken identity guard as a raw database error", () => {
    const m = restaurantSaveErrorMessage('record "new" has no field "category"');
    expect(m).not.toContain("record");
    expect(m.length).toBeGreaterThan(10);
  });
  it("keeps unknown server reasons visible", () => {
    expect(restaurantSaveErrorMessage("some other reason")).toContain("some other reason");
  });
});
