import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const COURIERS = ["TCS", "Leopards", "M&P", "BlueEx", "PostEx", "Trax", "Pakistan Post"];

const SHIPMENT_STATUSES: { value: string; label: string }[] = [
  { value: "pending", label: "تیاری میں (Pending)" },
  { value: "dispatched", label: "روانہ ہو گیا (Dispatched)" },
  { value: "in_transit", label: "راستے میں (In transit)" },
  { value: "out_for_delivery", label: "ڈلیوری کے لیے نکل گیا" },
  { value: "delivered", label: "ڈلیور ہو گیا ✅" },
  { value: "returned", label: "واپس (Returned)" },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  order: any;
  defaults?: { courier?: string | null; paymentType?: string | null; advancePercent?: number | null };
  onSaved?: () => void;
}

const CourierShipmentDialog = ({ open, onOpenChange, order, defaults, onSaved }: Props) => {
  const [courier, setCourier] = useState<string>(order?.courier_name || defaults?.courier || "");
  const [tracking, setTracking] = useState<string>(order?.tracking_number || "");
  const [trackingUrl, setTrackingUrl] = useState<string>(order?.courier_tracking_url || "");
  const [paymentType, setPaymentType] = useState<string>(order?.courier_payment_type || defaults?.paymentType || "cod");
  const [status, setStatus] = useState<string>(order?.shipment_status || "dispatched");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!courier.trim()) { toast.error("کورئیر کا نام درج کریں"); return; }
    if (!tracking.trim()) { toast.error("ٹریکنگ نمبر درج کریں"); return; }
    setSaving(true);
    const { error } = await supabase
      .from("grocery_cart_orders")
      .update({
        delivery_method: "courier",
        courier_name: courier.trim(),
        tracking_number: tracking.trim(),
        courier_tracking_url: trackingUrl.trim() || null,
        courier_payment_type: paymentType,
        shipment_status: status,
      } as any)
      .eq("id", order.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("شپمنٹ اپڈیٹ ہو گئی 📦 — کسٹمر کو اطلاع بھیج دی گئی");
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>کورئیر شپمنٹ — #{order?.id?.slice(0, 8)}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-bold text-muted-foreground">کورئیر کمپنی</label>
            <div className="flex flex-wrap gap-1.5 my-1.5">
              {COURIERS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCourier(c)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${courier === c ? "bg-primary text-primary-foreground border-primary" : "bg-background"}`}
                >
                  {c}
                </button>
              ))}
            </div>
            <Input value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="کورئیر کا نام" className="h-9 text-sm" />
          </div>

          <div>
            <label className="text-[11px] font-bold text-muted-foreground">ٹریکنگ نمبر</label>
            <Input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="CN / Tracking #" className="h-9 text-sm" />
          </div>

          <div>
            <label className="text-[11px] font-bold text-muted-foreground">ٹریکنگ لنک (اختیاری)</label>
            <Input value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} placeholder="https://..." className="h-9 text-sm" />
          </div>

          <div>
            <label className="text-[11px] font-bold text-muted-foreground">ادائیگی کی قسم</label>
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
            >
              <option value="cod">COD — ڈلیوری پر ادائیگی</option>
              <option value="advance">ایڈوانس (مکمل ادائیگی)</option>
              <option value="partial">جزوی ایڈوانس{defaults?.advancePercent ? ` (${defaults.advancePercent}%)` : ""}</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-muted-foreground">شپمنٹ اسٹیٹس</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
            >
              {SHIPMENT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <p className="mt-1 text-[10px] text-muted-foreground">
              اسٹیٹس بدلتے ہی آرڈر کی حالت خودکار اپڈیٹ ہو گی اور کسٹمر کو لائیو نوٹیفکیشن جائے گا۔
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={save} disabled={saving} className="w-full font-extrabold">
            {saving ? "محفوظ ہو رہا ہے..." : "محفوظ کریں"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CourierShipmentDialog;
