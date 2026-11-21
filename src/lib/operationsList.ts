export const OPERATIONS_PAGE_SIZE = 20;
export const FOOD_CLOSED_STATUSES = ["delivered", "completed", "cancelled", "returned_to_store"];

export function operationRange(page: number) {
  const start = (Math.max(1, Math.floor(page)) - 1) * OPERATIONS_PAGE_SIZE;
  return [start, start + OPERATIONS_PAGE_SIZE - 1] as const;
}

// Admin calendar dates mean Karachi calendar days, independent of browser timezone.
export function operationDates(from: string, to: string) {
  const valid = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00+05:00`));
  return {
    start: valid(from) ? new Date(`${from}T00:00:00+05:00`).toISOString() : null,
    end: valid(to) ? new Date(Date.parse(`${to}T00:00:00+05:00`) + 86400000).toISOString() : null,
    invalid: !!(from && to && from > to),
  };
}

export function safeOperationSearch(value: string) {
  return value.trim().replace(/[^\p{L}\p{N}\s+@._-]/gu, "").slice(0, 100);
}

export function operationIdFilter(value: string, column = "id") {
  const hex = value.replace(/-/g, "").toLowerCase();
  if (!/^[a-f0-9]{4,32}$/.test(hex)) return null;
  const uuid = (s: string) => `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
  return `and(${column}.gte.${uuid(hex.padEnd(32, "0"))},${column}.lte.${uuid(hex.padEnd(32, "f"))})`;
}

export function applyOperationFilters(builder: any, from: string, to: string, search: string, textColumns: string[], extraFilters: string[] = [], idColumn = "id") {
  const dates = operationDates(from, to);
  if (dates.start) builder = builder.gte("created_at", dates.start);
  if (dates.end) builder = builder.lt("created_at", dates.end);
  const term = safeOperationSearch(search);
  if (term) {
    const clauses = [...extraFilters];
    const id = operationIdFilter(term, idColumn);
    if (id) clauses.push(id);
    textColumns.forEach(column => clauses.push(`${column}.ilike.%${term}%`));
    builder = clauses.length ? builder.or(clauses.join(",")) : builder.eq(idColumn, "00000000-0000-0000-0000-000000000000");
  }
  return builder;
}