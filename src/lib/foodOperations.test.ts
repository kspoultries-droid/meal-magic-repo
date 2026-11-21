import { describe, it, expect } from "vitest";
import { foodCancellationAvailable } from "./foodOperations";
describe("Existing food cancellation boundaries", () => {
  it("allows cancellation before handover in preparing state", () => {
    expect(foodCancellationAvailable({ status: "preparing" })).toBe(true);
  });
  it("does not bypass the server's delivering restriction", () => {
    expect(foodCancellationAvailable({ status: "delivering" })).toBe(false);
  });
  it("blocks pickup and unresolved return", () => {
    expect(foodCancellationAvailable({ status: "preparing", picked_up_at: "2026-11-21T18:00:00Z" })).toBe(false);
    expect(foodCancellationAvailable({ status: "preparing", return_requested_at: "2026-11-21T18:00:00Z" })).toBe(false);
  });
});