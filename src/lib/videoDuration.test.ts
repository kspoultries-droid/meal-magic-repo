import { describe, it, expect } from "vitest";
import { isReelTooLong, MAX_REEL_SECONDS } from "./videoDuration";
describe("reel length limit", () => {
  it("is 45 seconds", () => expect(MAX_REEL_SECONDS).toBe(45));
  it("allows 45s and rejects 50s", () => { expect(isReelTooLong(45)).toBe(false); expect(isReelTooLong(50)).toBe(true); });
});
