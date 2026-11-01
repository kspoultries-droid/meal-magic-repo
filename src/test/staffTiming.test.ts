import { describe, expect, it } from "vitest";
import { isStaffOrderOverdue, elapsedMinutes, SUPPORT_SLA_MINUTES } from "@/lib/staffTiming";
describe("existing staff deadlines", () => {
  const start = "2026-11-01T10:00:00Z";
  it("alerts after the existing 10-minute waiting threshold", () => {
    expect(isStaffOrderOverdue(start, Date.parse("2026-11-01T10:11:00Z"))).toBe(true);
    expect(isStaffOrderOverdue(start, Date.parse("2026-11-01T10:09:00Z"))).toBe(false);
  });
  it("retains the existing 30-minute support threshold", () => {
    expect(SUPPORT_SLA_MINUTES).toBe(30);
    expect(elapsedMinutes(start, Date.parse("2026-11-01T10:31:00Z"))).toBe(31);
  });
});