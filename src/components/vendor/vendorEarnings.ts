import { supabase } from "@/integrations/supabase/client";

export type Period = "week" | "fortnight" | "month";

export const periodStart = (p: Period) => {
  const d = new Date();
  const days = p === "week" ? 7 : p === "fortnight" ? 15 : 30;
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
};

export interface VendorRow {
  vendorId: string;
  shopNames: string[];
  orders: number;
  gross: number;          // items value (بغیر ڈلیوری فیس)
  commissionRate: number; // %
  commission: number;
  net: number;            // vendor کو قابل ادائیگی
  paid: number;           // اس عرصے میں ادا شدہ
  pending: number;
}

/**
 * Reads the server-side commission ledger (`platform_commissions`).
 * Rates are frozen at order time, so numbers never change retroactively.
 */
export const loadVendorEarnings = async (from: Date, ownerId?: string): Promise<VendorRow[]> => {
  const iso = from.toISOString();

  let q = supabase
    .from("platform_commissions")
    .select("vendor_id, gross, rate, commission, net_payable, created_at")
    .gte("created_at", iso)
    .not("vendor_id", "is", null);
  if (ownerId) q = q.eq("vendor_id", ownerId);

  const { data: ledger } = await q;
  const rowsRaw = (ledger || []) as any[];

  const vendorIds = Array.from(new Set(rowsRaw.map((r) => r.vendor_id as string)));
  if (ownerId && !vendorIds.includes(ownerId)) vendorIds.push(ownerId);
  if (!vendorIds.length) return [];

  const restQ = supabase.from("restaurants").select("name, owner_id").in("owner_id", vendorIds);
  const storeQ = supabase.from("grocery_stores").select("name, owner_id").in("owner_id", vendorIds);
  const [{ data: rests }, { data: stores }, { data: payouts }] = await Promise.all([
    restQ,
    storeQ,
    supabase.from("payouts").select("vendor_id, amount, status, period_start")
      .in("vendor_id", vendorIds).gte("period_start", iso.slice(0, 10)),
  ]);

  const map = new Map<string, VendorRow>();
  const ensure = (vid: string) => {
    let row = map.get(vid);
    if (!row) {
      row = { vendorId: vid, shopNames: [], orders: 0, gross: 0, commissionRate: 0, commission: 0, net: 0, paid: 0, pending: 0 };
      map.set(vid, row);
    }
    return row;
  };

  vendorIds.forEach((vid) => ensure(vid));
  [...(rests || []), ...(stores || [])].forEach((s: any) => {
    const row = ensure(s.owner_id);
    if (s.name && !row.shopNames.includes(s.name)) row.shopNames.push(s.name);
  });

  rowsRaw.forEach((r) => {
    const row = ensure(r.vendor_id);
    row.orders += 1;
    row.gross += Number(r.gross || 0);
    row.commission += Number(r.commission || 0);
    row.net += Number(r.net_payable || 0);
    row.commissionRate = Math.max(row.commissionRate, Number(r.rate || 0));
  });

  const rows = Array.from(map.values()).map((r) => {
    const paid = (payouts || [])
      .filter((p: any) => p.vendor_id === r.vendorId && p.status === "paid")
      .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    const net = Math.round(r.net);
    return {
      ...r,
      gross: Math.round(r.gross),
      commission: Math.round(r.commission),
      commissionRate: Math.round(r.commissionRate),
      net,
      paid,
      pending: Math.max(0, net - paid),
    };
  });

  return rows.sort((a, b) => b.pending - a.pending);
};
