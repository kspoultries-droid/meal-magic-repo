import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { SHIPMENT_STATUSES, isValidShipmentTransition } from "@/lib/courier";
import { tr } from "@/lib/i18n/tr";
import { deliveryClosed } from "@/lib/riderOperations";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  order: any;
  defaults?: { courier?: string | null; paymentType?: string | null; advancePercent?: number | null };
  onSaved?: () => void;
}

const CourierShipmentDialog = ({ open, onOpenChange, order, defaults, onSaved }: Props) => {
  const [courier, setCourier] = useState<string>(order?.courier_name || "");
  const [tracking, setTracking] = useState<string>(order?.tracking_number || "");
  const [trackingUrl, setTrackingUrl] = useState<string>(order?.courier_tracking_url || "");
  const [paymentType, setPaymentType] = useState<string>(order?.courier_payment_type || defaults?.paymentType || "cod");
  const [status, setStatus] = useState<string>(order?.shipment_status || "pending");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (saving || deliveryClosed(order?.status)) return;
    if (order?.delivery_method !== "courier") { toast.error(tr("Delivery snapshot review required", "محفوظ ترسیل کے طریقے کا جائزہ درکار ہے")); return; }
    if (!courier.trim()) { toast.error(tr("Enter the actual courier name", "اصل کوریئر کا نام درج کریں")); return; }
    if (!tracking.trim()) { toast.error(tr("Enter the actual tracking number", "اصل ٹریکنگ نمبر درج کریں")); return; }
    if (!isValidShipmentTransition(order?.shipment_status, status)) {
      toast.error(tr("Shipment status cannot move backwards", "شپمنٹ اسٹیٹس پیچھے نہیں کیا جا سکتا"));
      return;
    }
    setSaving(true);
    try {
      let query = supabase
        .from("grocery_cart_orders")
        .update({
          courier_name: courier.trim(),
          tracking_number: tracking.trim(),
          courier_tracking_url: trackingUrl.trim() || null,
          courier_payment_type: paymentType,
          shipment_status: status,
        } as any)
        .eq("id", order.id).eq("status",order.status);
      query = order.shipment_status == null ? query.is("shipment_status",null) : query.eq("shipment_status",order.shipment_status);
      const {data,error} = await query.select("id").single();
      if (error || !data) { toast.error(error?.message || tr("Record changed; refresh and try again", "ریکارڈ بدل گیا؛ تازہ کر کے دوبارہ کوشش کریں")); return; }
      toast.success(tr("Courier record saved", "کوریئر ریکارڈ محفوظ ہو گیا"));
      onSaved?.();
      onOpenChange(false);
    } catch {
      toast.error(tr("Courier record could not be saved", "کوریئر ریکارڈ محفوظ نہیں ہو سکا"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tr("Manual courier record", "دستی کوریئر ریکارڈ")} — #{order?.id?.slice(0, 8)}</DialogTitle>
          <DialogDescription className="text-xs text-warning">{tr("Automatic API booking: Pending. Only actual courier receipt details are recorded here.", "خودکار API بکنگ: زیرِ التوا۔ یہاں صرف اصل کوریئر رسید کی تفصیل درج ہو گی۔")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label htmlFor="shipment-courier" className="text-[11px] font-bold text-muted-foreground">{tr("Actual courier company", "اصل کوریئر کمپنی")}</label>
            <Input id="shipment-courier" value={courier} onChange={(e) => setCourier(e.target.value)} placeholder={tr("Courier name on receipt", "رسید پر کوریئر کا نام")} className="h-9 text-sm" />
          </div>
          <div>
            <label htmlFor="shipment-cn" className="text-[11px] font-bold text-muted-foreground">{tr("Tracking number", "ٹریکنگ نمبر")}</label>
            <Input id="shipment-cn" dir="ltr" value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="CN / Tracking #" className="h-9 text-sm" />
          </div>
          <div>
            <label htmlFor="shipment-url" className="text-[11px] font-bold text-muted-foreground">{tr("Tracking link (optional)", "ٹریکنگ لنک (اختیاری)")}</label>
            <Input id="shipment-url" dir="ltr" value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} placeholder="https://..." className="h-9 text-sm" />
          </div>
          <div>
            <label htmlFor="shipment-payment" className="text-[11px] font-bold text-muted-foreground">{tr("Courier payment arrangement", "کوریئر ادائیگی کی ترتیب")}</label>
            <select id="shipment-payment" value={paymentType} onChange={(e) => setPaymentType(e.target.value)} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
              <option value="cod">{tr("COD — Cash on delivery", "COD — ڈیلیوری پر ادائیگی")}</option>
              <option value="advance">{tr("Advance", "ایڈوانس")}</option>
              <option value="partial">{tr("Partial advance", "جزوی ایڈوانس")}</option>
            </select>
            <p className="mt-1 text-[11px] text-muted-foreground">{tr("This arrangement is not proof of payment. Online gateway: Pending.", "یہ ترتیب رقم وصول ہونے کا ثبوت نہیں۔ آن لائن ادائیگی: زیرِ التوا۔")}</p>
          </div>
          <div>
            <label htmlFor="shipment-status" className="text-[11px] font-bold text-muted-foreground">{tr("Shipment status", "شپمنٹ اسٹیٹس")}</label>
            <select id="shipment-status" value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
              {SHIPMENT_STATUSES.map((s) => <option key={s.value} value={s.value}>{tr(s.value.replace(/_/g, " "), s.label)}</option>)}
            </select>
            <p className="mt-1 text-[11px] text-muted-foreground">{tr("Dispatch, delivery and return statuses also affect the order. Record only confirmed courier events.", "روانگی، ڈیلیوری اور واپسی کی حالت آرڈر پر بھی اثر ڈالتی ہے۔ صرف تصدیق شدہ کوریئر واقعات درج کریں۔")}</p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={saving || deliveryClosed(order?.status) || order?.delivery_method !== "courier"} className="w-full font-extrabold">
            {saving ? tr("Saving...", "محفوظ ہو رہا ہے...") : tr("Save courier record", "کوریئر ریکارڈ محفوظ کریں")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CourierShipmentDialog;
