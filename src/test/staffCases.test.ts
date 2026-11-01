import { describe, expect, it } from "vitest";
import { caseOverdue, approvalUsable } from "@/lib/staffCases";
describe("Staff case and approval rules", () => {
  const now = Date.parse("2026-11-01T12:00:00Z");
  it("does not treat a resolved case as overdue", () => {
    expect(caseOverdue({ status: "resolved", due_at: "2026-11-01T11:00:00Z" }, now)).toBe(false);
    expect(caseOverdue({ status: "open", due_at: "2026-11-01T11:00:00Z" }, now)).toBe(true);
  });
  it("does not invent a deadline for departments without one", () => {
    expect(caseOverdue({ status: "open", due_at: null }, now)).toBe(false);
  });
  it("rejects expired, used, and incomplete approvals", () => {
    const row = { status: "pending", expires_at: "2026-11-02T12:00:00Z", payload: { amount: 100 } };
    expect(approvalUsable(row, now)).toBe(true);
    expect(approvalUsable({ ...row, expires_at: "2026-11-01T12:00:00Z" }, now)).toBe(false);
    expect(approvalUsable({ ...row, used_at: "2026-11-01T11:00:00Z" }, now)).toBe(false);
    expect(approvalUsable({ ...row, payload: {} }, now)).toBe(false);
  });
});