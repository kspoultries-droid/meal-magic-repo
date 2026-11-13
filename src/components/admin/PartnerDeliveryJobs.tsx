import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { tr } from "@/lib/i18n/tr";
import { toast } from "sonner";

type Job = { id: string; external_order_no: string; amount: number; cod: boolean; pickup: any; dropoff: any; status: string; created_at: string };

export default function PartnerDeliveryJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const load = async () => {
    const { data } = await (supabase as any).from("partner_delivery_jobs").select("*").neq("status", "delivered").order("created_at", { ascending: false }).limit(30);
    setJobs(data || []);
  };
  useEffect(() => { load(); }, []);
  const setStatus = async (id: string, status: string) => {
    const { error } = await (supabase as any).from("partner_delivery_jobs").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message); else load();
  };
  if (!jobs.length) return null;
  return (
    <div className="mb-4 space-y-2 rounded-xl border bg-card p-3">
      <p className="text-sm font-semibold">{tr("ApnaHub delivery requests", "ApnaHub ڈیلیوری درخواستیں")}</p>
      {jobs.map(j => (
        <div key={j.id} className="rounded-lg border p-2 text-xs space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">#{j.external_order_no} · {j.pickup?.shop_name || "Shop"}</span>
            <Badge variant="outline">{j.status}</Badge>
          </div>
          <p>{tr("Pickup", "پک اپ")}: {j.pickup?.shop_address || "-"} {j.pickup?.shop_phone && <a className="text-primary" href={`tel:${j.pickup.shop_phone}`}>{j.pickup.shop_phone}</a>}</p>
          <p>{tr("Drop", "ڈراپ")}: {j.dropoff?.address || "-"}, {j.dropoff?.city || ""} {j.dropoff?.phone && <a className="text-primary" href={`tel:${j.dropoff.phone}`}>{j.dropoff.phone}</a>}</p>
          <p>Rs {Number(j.amount).toLocaleString()} {j.cod ? tr("(collect cash)", "(نقد وصول کریں)") : tr("(paid)", "(ادا شدہ)")}</p>
          <div className="flex gap-2">
            {j.status === "pending" && <Button size="sm" className="h-7 text-[11px]" onClick={() => setStatus(j.id, "assigned")}>{tr("Rider sent", "رائیڈر بھیج دیا")}</Button>}
            <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setStatus(j.id, "delivered")}>{tr("Delivered", "ڈیلیور ہو گیا")}</Button>
            <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => setStatus(j.id, "cancelled")}>{tr("Cancel", "منسوخ")}</Button>
          </div>
        </div>
      ))}
    </div>
  );
}
