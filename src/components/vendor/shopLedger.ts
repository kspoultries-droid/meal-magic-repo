export type SaleBucket = "sold" | "active" | "cancelled";

export const saleBucket = (status: string): SaleBucket =>
  ["delivered", "completed"].includes(status) ? "sold" : ["cancelled", "returned_to_store", "rejected"].includes(status) ? "cancelled" : "active";

const itemsValue = (r: any) => (Array.isArray(r.items) ? r.items : []).reduce((s: number, it: any) => s + Number(it.price || 0) * Number(it.quantity ?? it.qty ?? 1), 0);

/** Groups orders by Karachi day. Shop share comes only from the server commission ledger; without a ledger row it is 0 (not yet settled). */
export const groupSalesByDay = (orders: any[], ledger: Record<string, { commission: number; net: number }>) => {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" });
  const label = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", day: "numeric", month: "short", year: "numeric" });
  const map = new Map<string, { day: string; label: string; orders: any[]; items: number; commission: number; net: number }>();
  for (const o of orders) {
    const day = fmt.format(new Date(o.created_at));
    let g = map.get(day);
    if (!g) { g = { day, label: label.format(new Date(o.created_at)), orders: [], items: 0, commission: 0, net: 0 }; map.set(day, g); }
    g.orders.push(o);
    g.items += itemsValue(o);
    const l = ledger[o.id];
    if (l && saleBucket(o.status) === "sold") { g.commission += l.commission; g.net += l.net; }
  }
  return Array.from(map.values()).sort((a, b) => b.day.localeCompare(a.day));
};
