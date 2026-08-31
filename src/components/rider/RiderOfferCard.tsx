import { useEffect, useMemo, useRef, useState } from "react";


import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock3, MapPin, PackageCheck, Store, X } from "lucide-react";
import { toast } from "sonner";

interface DeliveryOffer {
  id: string;
  order_id: string;
  order_kind: string;
  pickup_name: string | null;
  dropoff_address: string | null;
  total_amount: number | null;
  delivery_fee: number;
  distance_km: number | null;
  expires_at: string;
}

interface Props {
  riderId: string;
  onChanged: () => void;
}

const kindLabel: Record<string, string> = {
  food: "فوڈ آرڈر",
  grocery_cart: "گروسری آرڈر",
  grocery_list: "لسٹ آرڈر",
};

const RiderOfferCard = ({ riderId, onChanged }: Props) => {
  const [offer, setOffer] = useState<DeliveryOffer | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const onChangedRef = useRef(onChanged);
  const alertedOfferRef = useRef<string | null>(null);
  onChangedRef.current = onChanged;

  const fetchOffer = async () => {
    const { data, error } = await (supabase as any)
      .from("delivery_offers")
      .select("id,order_id,order_kind,pickup_name,dropoff_address,total_amount,delivery_fee,distance_km,expires_at")
      .eq("rider_id", riderId)
      .eq("status", "offered")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!error) {
      const next = data as DeliveryOffer | null;
      setOffer(next);
      if (next && alertedOfferRef.current !== next.id) {
        alertedOfferRef.current = next.id;
        try { navigator.vibrate?.([400, 150, 400, 150, 600]); } catch { /* unsupported */ }
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            const context = new AudioContextClass();
            const oscillator = context.createOscillator();
            oscillator.connect(context.destination);
            oscillator.frequency.value = 880;
            oscillator.start();
            oscillator.stop(context.currentTime + 0.25);
          }
        } catch { /* browser may block audio */ }
        toast.info("نیا ڈیلیوری آفر — ابھی جواب دیں", { id: `offer-${next.id}` });
      }
    }
  };

  useEffect(() => {
    fetchOffer();
    const interval = window.setInterval(fetchOffer, 2500);
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    const channel = supabase
      .channel(`delivery-offers-${riderId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_offers", filter: `rider_id=eq.${riderId}` }, fetchOffer)
      .subscribe();
    return () => {
      window.clearInterval(interval);
      window.clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [riderId]);

  const secondsLeft = useMemo(() => {
    if (!offer) return 0;
    return Math.max(0, Math.ceil((new Date(offer.expires_at).getTime() - now) / 1000));
  }, [offer, now]);

  useEffect(() => {
    if (offer && secondsLeft === 0) {
      setOffer(null);
      onChangedRef.current();
      fetchOffer();
    }
  }, [offer, secondsLeft]);

  const respond = async (action: "accept_delivery_offer" | "decline_delivery_offer") => {
    if (!offer || busy) return;
    setBusy(true);
    const { error } = await supabase.rpc(action, { _offer_id: offer.id });
    if (error) {
      toast.error(error.message);
    } else if (action === "accept_delivery_offer") {
      toast.success("آرڈر آپ کو مل گیا ✅");
    } else {
      toast.success("آفر چھوڑ دی گئی");
    }
    setOffer(null);
    setBusy(false);
    onChangedRef.current();
    fetchOffer();
  };

  if (!offer || secondsLeft === 0) return null;

  return (
    <Card className="overflow-hidden border-primary/40 bg-primary/5 shadow-md">
      <div className="flex items-center justify-between gap-3 border-b border-primary/15 bg-primary/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <PackageCheck className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-extrabold">نیا ڈیلیوری آفر</p>
            <p className="text-[11px] text-muted-foreground">{kindLabel[offer.order_kind] || "نیا آرڈر"}</p>
          </div>
        </div>
        <Badge className="gap-1 bg-background text-foreground">
          <Clock3 className="h-3 w-3" /> {secondsLeft} سیکنڈ
        </Badge>
      </div>
      <CardContent className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border bg-background/70 p-2.5">
            <p className="mb-1 flex items-center gap-1 text-[10px] font-bold text-muted-foreground"><Store className="h-3 w-3" /> پک اَپ</p>
            <p className="truncate font-extrabold">{offer.pickup_name || "دکان / ریسٹورنٹ"}</p>
          </div>
          <div className="rounded-lg border bg-background/70 p-2.5">
            <p className="mb-1 flex items-center gap-1 text-[10px] font-bold text-muted-foreground"><MapPin className="h-3 w-3" /> ڈراپ آف</p>
            <p className="line-clamp-2 font-bold">{offer.dropoff_address || "پتہ دستیاب نہیں"}</p>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-background/70 px-3 py-2 text-xs">
          <span className="text-muted-foreground">فاصلہ {offer.distance_km == null ? "نامعلوم" : `${Number(offer.distance_km).toFixed(1)} کلومیٹر`}</span>
          <span className="font-bold text-muted-foreground">وصولی Rs {Math.round(Number(offer.total_amount || 0))}</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button disabled={busy} onClick={() => respond("accept_delivery_offer")} className="h-10 font-extrabold">قبول کریں</Button>
          <Button disabled={busy} variant="outline" onClick={() => respond("decline_delivery_offer")} className="h-10 font-extrabold"><X className="h-4 w-4" /> چھوڑ دیں</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RiderOfferCard;
