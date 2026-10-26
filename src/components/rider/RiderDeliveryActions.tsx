import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, PackageCheck, Home, Check, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { deliveryCash, nextDeliveryAction } from "@/lib/riderOperations";

type Order = { id: string; status: string; delivery_stage?: string; payment_method?: string | null; final_amount?: number | string | null; total_amount?: number | string | null; delivery_failure_reason?: string | null; accepted_at?: string | null; created_at?: string | null; prep_minutes?: number | null; ready_at?: string | null };
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
  const [dialog, setDialog] = useState<"deliver" | "fail" | "override" | null>(null);
  const [cash, setCash] = useState("");
  const [reason, setReason] = useState("");
  const stage = order.delivery_stage || "assigned";
  const action = nextDeliveryAction(kind, order.status, stage);
  const due = deliveryCash(order);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 15000); return () => window.clearInterval(t); }, []);
  const readyAt = kind === "food" ? (order.ready_at ? new Date(order.ready_at).getTime() : new Date(order.accepted_at || order.created_at || Date.now()).getTime() + (order.prep_minutes ?? 15) * 60000) : null;
  const pickupMins = readyAt == null ? null : Math.round((readyAt - now) / 60000);
  const run = async (value: string, override = false) => {
    if (busy) return;
    if (value === "deliver" && (cash.trim() === "" || Number(cash) !== due)) { toast.error(`وصولی Rs ${due} ہونی چاہیے؛ فرق ہو تو مسئلہ درج کریں`); return; }
    setBusy(true);
    try {
      const pos = ["arrived_pickup", "arrived_customer"].includes(value) ? await new Promise<GeolocationPosition | null>(resolve => {
        if (!navigator.geolocation) { resolve(null); return; }
        navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 });
      }) : null;
      const { error } = await supabase.rpc("rider_delivery_action", { _kind: kind, _order_id: order.id, _action: value, _lat: pos?.coords.latitude, _lng: pos?.coords.longitude, _cash: value === "deliver" ? Number(cash) : undefined, _reason: value === "fail" || override ? reason : undefined });
      if (error) { if (value === "arrived_customer" && !override && error.message.includes("150")) { setReason(""); setDialog("override"); return; } throw error; }
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
    {pickupMins != null && ["assigned", "arrived_pickup"].includes(stage) && order.status !== "delivering" && <p className={`rounded-md border p-2 text-xs font-bold ${pickupMins < 0 ? "border-destructive/30 bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>{pickupMins > 0 ? `کھانا تقریباً ${pickupMins} منٹ میں تیار — اسی وقت تک پک اَپ پر پہنچیں` : pickupMins === 0 ? "کھانا ابھی تیار ہونے والا ہے" : `تیاری کا وقت ${-pickupMins} منٹ پہلے گزر گیا`} · {new Date(readyAt!).toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit" })}</p>}
    {kind === "food" && order.status === "delivering" && ["assigned", "arrived_pickup"].includes(stage) && <p className="rounded-md border bg-primary/10 p-2 text-xs font-bold text-primary">کھانا تیار ہے — فوراً پک اَپ کریں</p>}
    <p className="text-xs font-bold">نقد وصولی / Cash: Rs {due}</p>
    {stage === "return_pending" ? <p className="rounded-md border border-warning/30 bg-warning/10 p-2 text-xs text-warning">واپسی زیرِنگرانی / Return pending — {order.delivery_failure_reason}</p> : action ? <Button className="w-full text-xs" disabled={busy} onClick={() => { if (action === "deliver") { setCash(""); setDialog("deliver"); } else void run(action); }}>
      {busy ? <Loader2 className="animate-spin" /> : (() => { const Icon = actions[action].Icon; return <Icon />; })()}{actions[action].label}
    </Button> : stage === "arrived_pickup" ? <p className="text-xs text-muted-foreground">سامان تیار ہونے کا انتظار / Waiting for readiness</p> : null}
    {["picked_up", "arrived_customer"].includes(stage) && <Button variant="outline" className="w-full text-xs text-destructive" disabled={busy} onClick={() => { setReason(""); setDialog("fail"); }}><AlertTriangle /> ڈیلیوری میں مسئلہ / Delivery problem</Button>}
    <Dialog open={dialog !== null} onOpenChange={open => { if (!open && !busy) setDialog(null); }}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>{dialog === "deliver" ? "وصولی کی تصدیق / Confirm collection" : dialog === "override" ? "آپ کسٹمر کے پن سے 150 میٹر سے دور ہیں" : "مسئلہ اور واپسی / Delivery exception"}</DialogTitle></DialogHeader>
      {dialog === "deliver" ? <><p className="text-sm">{due === 0 ? "آن لائن ادائیگی؛ نقد وصولی Rs 0" : `کسٹمر سے وصول شدہ رقم: Rs ${due}`}</p><Input aria-label="وصول شدہ نقد" type="number" min="0" step="0.01" inputMode="decimal" value={cash} onChange={e => setCash(e.target.value)} /></> : dialog === "override" ? <><p className="text-xs text-muted-foreground">اگر کسٹمر نے فون پر دوسری جگہ بلایا یا نقشے کا پن غلط ہے تو وجہ لکھیں۔ یہ فاصلہ اور وجہ ایڈمن کی جانچ کے لیے محفوظ ہوگی۔</p><Input aria-label="دور سے پہنچنے کی وجہ" value={reason} onChange={e => setReason(e.target.value)} placeholder="مثلاً کسٹمر نے گلی کے کونے پر بلایا" /></> : <Input aria-label="ڈیلیوری مسئلے کی وجہ" value={reason} onChange={e => setReason(e.target.value)} placeholder="وجہ / Reason" />}
      <Button disabled={busy || (dialog === "deliver" ? cash.trim() === "" || Number(cash) !== due : reason.trim().length < 3)} onClick={() => void (dialog === "override" ? run("arrived_customer", true) : run(dialog === "deliver" ? "deliver" : "fail"))}>{busy ? <Loader2 className="animate-spin" /> : <Check />} تصدیق / Confirm</Button>
    </DialogContent></Dialog>
  </div>;
}