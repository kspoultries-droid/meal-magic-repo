export const CASE_DEPARTMENTS: Record<string, string> = { orders: "آرڈرز", dispatch: "ڈسپیچ", riders: "رائیڈرز", partners: "پارٹنرز", finance: "مالی امور", support: "شکایات" };
export const CASE_STATUS: Record<string, string> = { open: "کھلا", in_progress: "جاری", blocked: "رکاوٹ", review: "نتیجہ جانچیں", resolved: "حل شدہ" };
export function caseOverdue(c: { status: string; due_at: string | null }, now = Date.now()) {
  return c.status !== "resolved" && c.due_at !== null && new Date(c.due_at).getTime() < now;
}
export function approvalUsable(r: { status: string; expires_at?: string; used_at?: string | null; payload?: unknown }, now = Date.now()) {
  return r.status === "pending" && !r.used_at && !!r.expires_at && new Date(r.expires_at).getTime() > now && !!r.payload && Object.keys(r.payload).length > 0;
}