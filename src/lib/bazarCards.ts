export const BAZAR_CARD_LIMIT = 15;

export type BazarCard = {
  title?: string | null; brand_name?: string | null; image_url?: string | null;
  link_url?: string | null; placements?: string[] | null; is_active?: boolean | null;
  payment_status?: string | null; start_date?: string | null; end_date?: string | null;
};

export function cardDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function validCardLink(link: string) {
  if (/^\/(?!\/)[^\s]*$/.test(link)) return true;
  try { return new URL(link).protocol === "https:"; } catch { return false; }
}

export function visibleBazarCards<T extends BazarCard>(cards: T[], date = cardDate()) {
  return cards.filter(c => c.placements?.includes("bazar_top") && c.is_active && c.payment_status === "paid"
    && c.title?.trim() && c.brand_name?.trim() && c.image_url?.trim()
    && (!c.link_url || validCardLink(c.link_url))
    && (!c.start_date || c.start_date <= date) && (!c.end_date || c.end_date >= date))
    .slice(0, BAZAR_CARD_LIMIT);
}

export function cardDatesValid(start: string, end: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(start) && /^\d{4}-\d{2}-\d{2}$/.test(end) && end >= start;
}