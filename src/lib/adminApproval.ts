export type ApprovalRow = { id: string; status: string; requested_by: string };
export const eligibleApprovals = (rows: ApprovalRow[], selected: string[], userId: string | undefined, canApprove: boolean) =>
  !userId || !canApprove ? [] : rows.filter(row => selected.includes(row.id) && row.status === "pending" && row.requested_by !== userId);