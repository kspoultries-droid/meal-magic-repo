import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, PackageCheck, Home, Check, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { deliveryCash, nextDeliveryAction } from "@/lib/riderOperations";

type Order = { id: string; status: string; delivery_stage?: string; payment_method?: string | null; final_amount?: number | string | null; total_amount?: number | string | null; delivery_failure_reason?: string | null };
const steps = ["assigned", "arrived_pickup", "picked_up", "arrived_customer", "delivered"];
const labels = ["دکان پہنچا", "سامان اٹھایا", "دروازے پر", "مکمل"];
const actions = {
  arrived_pickup: { label: "دکان پر پہنچ گیا / At pickup", Icon: MapPin },
  pickup: { label: "سامان اٹھا لیا / Picked up", Icon: PackageCheck },
  arrived_customer: { label: "کسٹمر کے پاس پہنچ گیا / At customer", Icon: Home },
  deliver: { label: "وصولی اور تکمیل / Complete delivery", Icon: Check },
};

export default function RiderDeliveryActions({ order, kind, onChanged }: { order: Order; kind: "food" | "grocery_cart" | "grocery_list"; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<"deliver" | "fail" | null>(null);
  const [cash, setCash] = useState("");
  const [reason, setReason] = useState("");
  const stage = order.delivery_stage || "assigned";
  const action = nextDeliveryAction(kind, order.status, stage);
  const due = deliveryCash(order);
  const run = async (value: string) => {
    if (busy) return;
    if (value === "deliver" && (cash.trim() === "" || Number(cash) !== due)) { toast.error(`وصولی Rs ${due} ہونی چاہیے؛ فرق ہو تو مسئلہ درج کریں`); return; }
    setBusy(true);
    try {
      const pos = ["arrived_pickup", "arrived_customer"].includes(value) ? await new Promise<GeolocationPosition | null>(resolve => {
        if (!navigator.geolocation) { resolve(null); return; }
        navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 });
      }) : null;
      const { error } = await supabase.rpc("rider_delivery_action", { _kind: kind, _order_id: order.id, _action: value, _lat: pos?.coords.latitude, _lng: pos?.coords.longitude, _cash: value === "deliver" ? Number(cash) : undefined, _reason: value === "fail" ? reason : undefined });
      if (error) throw error;
      toast.success(value === "fail" ? "مسئلہ درج؛ واپسی کی تصدیق سپورٹ کرے گی" : "مرحلہ محفوظ ہو گیا");
      setDialog(null); onChanged();
    } catch (error) { toast.error(error instanceof Error ? error.message : (error as { message?: string })?.message || "رابطہ نہیں ہوا؛ دوبارہ کوشش کریں"); }
    finally { setBusy(false); }
  };
  const current = steps.indexOf(stage);
  return <div className="space-y-2" dir="rtl">
    <div className="grid grid-cols-4 gap-1 text-center text-[10px] font-bold">
      {labels.map((label, i) => <div key={label} className={`rounded-md border px-1 py-2 ${current > i ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}>{i + 1}. {label}</div>)}
    </div>
    <p className="text-xs font-bold">نقد وصولی / Cash: Rs {due}</p>
    {stage === "return_pending" ? <p className="rounded-md border border-warning/30 bg-warning/10 p-2 text-xs text-warning">واپسی زیرِنگرانی / Return pending — {order.delivery_failure_reason}</p> : action ? <Button className="w-full text-xs" disabled={busy} onClick={() => { if (action === "deliver") { setCash(""); setDialog("deliver"); } else void run(action); }}>
      {busy ? <Loader2 className="animate-spin" /> : (() => { const Icon = actions[action].Icon; return <Icon />; })()}{actions[action].label}
    </Button> : stage === "arrived_pickup" ? <p className="text-xs text-muted-foreground">سامان تیار ہونے کا انتظار / Waiting for readiness</p> : null}
    {["picked_up", "arrived_customer"].includes(stage) && <Button variant="outline" className="w-full text-xs text-destructive" disabled={busy} onClick={() => { setReason(""); setDialog("fail"); }}><AlertTriangle /> ڈیلیوری میں مسئلہ / Delivery problem</Button>}
    <Dialog open={dialog !== null} onOpenChange={open => { if (!open && !busy) setDialog(null); }}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>{dialog === "deliver" ? "وصولی کی تصدیق / Confirm collection" : "مسئلہ اور واپسی / Delivery exception"}</DialogTitle></DialogHeader>
      {dialog === "deliver" ? <><p className="text-sm">{due === 0 ? "آن لائن ادائیگی؛ نقد وصولی Rs 0" : `کسٹمر سے وصول شدہ رقم: Rs ${due}`}</p><Input aria-label="وصول شدہ نقد" type="number" min="0" step="0.01" inputMode="decimal" value={cash} onChange={e => setCash(e.target.value)} /></> : <Input aria-label="ڈیلیوری مسئلے کی وجہ" value={reason} onChange={e => setReason(e.target.value)} placeholder="وجہ / Reason" />}
      <Button disabled={busy || (dialog === "deliver" ? cash.trim() === "" || Number(cash) !== due : reason.trim().length < 3)} onClick={() => void run(dialog === "deliver" ? "deliver" : "fail")}>{busy ? <Loader2 className="animate-spin" /> : <Check />} تصدیق / Confirm</Button>
    </DialogContent></Dialog>
  </div>;
}