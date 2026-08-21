import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Package, Truck, MapPin, CheckCircle2, RotateCcw, Clock } from "lucide-react";
import { SHIPMENT_MESSAGES, SHIPMENT_STATUSES, shipmentRank } from "@/lib/courier";

const ICONS: Record<string, any> = {
  pending: Package,
  dispatched: Truck,
  in_transit: Truck,
  out_for_delivery: MapPin,
  delivered: CheckCircle2,
  returned: RotateCcw,
};

interface Props {
  orderId: string;
  courierName?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  shipmentStatus?: string | null;
  paymentType?: string | null;
}

/** Courier header + live delivery timeline + saved update history (receipt). */
const CourierTimeline = ({
  orderId,
  courierName,
  trackingNumber,
  trackingUrl,
  shipmentStatus,
  paymentType,
}: Props) => {
  const [events, setEvents] = useState<any[]>([]);

  const load = async () => {
    const { data } = await (supabase as any)
      .from("order_events")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });
    setEvents(data || []);
  };

  useEffect(() => {
    if (orderId) load();
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;
    const ch = supabase
      .channel(`order-events-${orderId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "order_events", filter: `order_id=eq.${orderId}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [orderId]);

  const currentRank = shipmentRank(shipmentStatus);
  const steps = SHIPMENT_STATUSES.filter((s) => s.value !== "returned");
  const shipmentEvents = events.filter((e) => e.event_type !== "status" || true);

  const copy = async () => {
    if (!trackingNumber) return;
    try {
      await navigator.clipboard.writeText(trackingNumber);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mx-4 mt-4 rounded-2xl border bg-card p-4 shadow-soft space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">کورئیر ڈلیوری</p>
          <p className="font-extrabold text-foreground truncate">{courierName || "کورئیر مقرر نہیں"}</p>
          {trackingNumber && (
            <button onClick={copy} className="mt-1 font-mono text-xs text-primary underline underline-offset-2">
              #{trackingNumber} (کاپی کریں)
            </button>
          )}
          {paymentType && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              ادائیگی: {paymentType === "cod" ? "ڈلیوری پر (COD)" : paymentType === "advance" ? "ایڈوانس" : "جزوی ایڈوانس"}
            </p>
          )}
        </div>
        {trackingUrl && (
          <a
            href={trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-full bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
          >
            ٹریک کریں
          </a>
        )}
      </div>

      {/* Live timeline */}
      <div>
        {steps.map((s, i) => {
          const Icon = ICONS[s.value] || Package;
          const done = currentRank >= 0 && shipmentRank(s.value) <= currentRank;
          const current = s.value === shipmentStatus;
          return (
            <div key={s.value} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    done ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                  } ${current ? "ring-4 ring-primary/20" : ""}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-0.5 h-8 ${done && !current ? "bg-primary" : "bg-border"}`} />
                )}
              </div>
              <div className="pt-1.5">
                <p className={`text-sm font-bold ${done ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</p>
                {current && <p className="text-xs text-primary">{SHIPMENT_MESSAGES[s.value]}</p>}
              </div>
            </div>
          );
        })}
        {shipmentStatus === "returned" && (
          <p className="text-sm font-bold text-destructive">{SHIPMENT_MESSAGES.returned}</p>
        )}
      </div>

      {/* Saved update history / receipt */}
      <div className="rounded-xl border bg-background p-3">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-extrabold">
          <Clock className="h-3.5 w-3.5" /> اپڈیٹس کی تاریخ
        </p>
        {shipmentEvents.length === 0 ? (
          <p className="text-xs text-muted-foreground">ابھی کوئی اپڈیٹ نہیں</p>
        ) : (
          <div className="space-y-2">
            {shipmentEvents.map((e) => (
              <div key={e.id} className="flex items-start justify-between gap-2 text-xs">
                <span className="text-foreground">
                  {e.event_type === "courier"
                    ? `ٹریکنگ نمبر: ${e.tracking_number}`
                    : SHIPMENT_MESSAGES[e.to_value] || `${e.from_value || "—"} → ${e.to_value}`}
                </span>
                <span className="shrink-0 text-muted-foreground">
                  {new Date(e.created_at).toLocaleString("ur-PK", { dateStyle: "short", timeStyle: "short" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CourierTimeline;
