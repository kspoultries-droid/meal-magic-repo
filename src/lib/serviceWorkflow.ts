export const serviceStages = ["pending", "accepted", "en_route", "inspecting", "awaiting_quote", "quote_approved", "working", "completed"] as const;
export const serviceStageLabels: Record<string, [string, string]> = {
 pending: ["New booking", "نئی بکنگ"], accepted: ["Accepted", "قبول شدہ"], en_route: ["On the way", "راستے میں"], inspecting: ["Inspection", "معائنہ"], awaiting_quote: ["Awaiting approval", "منظوری کا انتظار"], quote_approved: ["Quote approved", "کوٹیشن منظور"], working: ["Work in progress", "کام جاری"], completed: ["Completed", "مکمل"], cancelled: ["Cancelled", "منسوخ"]
};
export function serviceActions(status: string, stage: string, approved: boolean, ownProvider: boolean) {
 if (status === "completed" || status === "cancelled") return [];
 if (status === "pending") return ["accept", ...(ownProvider ? ["reject"] : [])];
 if (status === "confirmed") return [...(stage === "accepted" || stage === "pending" ? ["en_route"] : []), ...(stage !== "inspecting" && stage !== "awaiting_quote" && stage !== "quote_approved" ? ["inspect"] : []), ...(approved ? ["start"] : [])];
 return status === "in_progress" ? ["complete"] : [];
}
export function validQuote(labour: number, parts: number, other: number) {
 return [labour, parts, other].every(n => Number.isFinite(n) && n >= 0) && labour + parts + other > 0 && labour + parts + other <= 10000000;
}
