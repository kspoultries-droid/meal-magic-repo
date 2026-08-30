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

const DELIVERED = ["delivered", "completed"];

/** Loads sales for all vendors (admin) or a single vendor (ownerId given). */
export const loadVendorEarnings = async (from: Date, ownerId?: string): Promise<VendorRow[]> => {
  const iso = from.toISOString();

  const restQ = supabase.from("restaurants").select("id, name, owner_id, commission_rate");
  const storeQ = supabase.from("grocery_stores").select("id, name, owner_id");
  const [{ data: rests }, { data: stores }] = await Promise.all([
    ownerId ? restQ.eq("owner_id", ownerId) : restQ,
    ownerId ? storeQ.eq("owner_id", ownerId) : storeQ,
  ]);

  const restIds = (rests || []).map((r) => r.id);
  const storeIds = (stores || []).map((s) => s.id);

  const [{ data: foodOrders }, { data: groceryOrders }] = await Promise.all([
    restIds.length
      ? supabase.from("orders").select("restaurant_id, total_amount, delivery_fee, status, created_at")
          .in("restaurant_id", restIds).in("status", DELIVERED).gte("created_at", iso)
      : Promise.resolve({ data: [] as any[] }),
    storeIds.length
      ? supabase.from("grocery_cart_orders").select("store_id, total_amount, delivery_fee, status, created_at")
          .in("store_id", storeIds).in("status", DELIVERED).gte("created_at", iso)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const vendorIds = Array.from(new Set([...(rests || []).map((r) => r.owner_id), ...(stores || []).map((s) => s.owner_id)]));
  const { data: settings } = vendorIds.length
    ? await supabase.from("payout_settings").select("user_id, commission_rate").in("user_id", vendorIds)
    : { data: [] as any[] };
  const { data: payouts } = vendorIds.length
    ? await supabase.from("payouts").select("vendor_id, amount, status, period_start").in("vendor_id", vendorIds).gte("period_start", iso.slice(0, 10))
    : { data: [] as any[] };

  const map = new Map<string, VendorRow>();
  const ensure = (vid: string, shop: string, rate: number) => {
    if (!map.has(vid)) {
      map.set(vid, { vendorId: vid, shopNames: [], orders: 0, gross: 0, commissionRate: rate, commission: 0, net: 0, paid: 0, pending: 0 });
    }
    const row = map.get(vid)!;
    if (!row.shopNames.includes(shop)) row.shopNames.push(shop);
    return row;
  };

  const rateFor = (vid: string, fallback: number) =>
    Number((settings || []).find((s: any) => s.user_id === vid)?.commission_rate ?? fallback);

  (rests || []).forEach((r: any) => {
    const row = ensure(r.owner_id, r.name, rateFor(r.owner_id, Number(r.commission_rate ?? 15)));
    (foodOrders || []).filter((o: any) => o.restaurant_id === r.id).forEach((o: any) => {
      row.orders += 1;
      row.gross += Math.max(0, Number(o.total_amount || 0) - Number(o.delivery_fee || 0));
    });
  });

  (stores || []).forEach((s: any) => {
    const row = ensure(s.owner_id, s.name, rateFor(s.owner_id, 15));
    (groceryOrders || []).filter((o: any) => o.store_id === s.id).forEach((o: any) => {
      row.orders += 1;
      row.gross += Math.max(0, Number(o.total_amount || 0) - Number(o.delivery_fee || 0));
    });
  });

  const rows = Array.from(map.values()).map((r) => {
    const commission = Math.round((r.gross * r.commissionRate) / 100);
    const paid = (payouts || [])
      .filter((p: any) => p.vendor_id === r.vendorId && p.status === "paid")
      .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    const net = Math.max(0, Math.round(r.gross) - commission);
    return { ...r, gross: Math.round(r.gross), commission, net, paid, pending: Math.max(0, net - paid) };
  });

  return rows.sort((a, b) => b.pending - a.pending);
};
