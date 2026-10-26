import { describe, expect, it } from "vitest";
import { eligibleApprovals } from "@/lib/adminApproval";

const rows = [
  { id: "own", status: "pending", requested_by: "me" },
  { id: "other", status: "pending", requested_by: "someone" },
  { id: "closed", status: "approved", requested_by: "someone" },
];
describe("existing two-person approval safeguards in bulk selection", () => {
  it("excludes the requester's own request", () => {
    expect(eligibleApprovals(rows, ["own", "other"], "me", true).map(r => r.id)).toEqual(["other"]);
  });
  it("requires approve permission", () => {
    expect(eligibleApprovals(rows, ["other"], "me", false)).toEqual([]);
  });
  it("only includes pending selected requests", () => {
    expect(eligibleApprovals(rows, ["closed"], "me", true)).toEqual([]);
    expect(eligibleApprovals(rows, [], "me", true)).toEqual([]);
  });
});