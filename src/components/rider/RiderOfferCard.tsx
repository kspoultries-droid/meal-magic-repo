import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MapPin, PackageCheck, Store, X, Wallet, Banknote } from "lucide-react";
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
  created_at: string;
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

const DECLINE_REASONS = ["بہت دور ہے", "بائیک خراب ہے", "پہلے سے مصروف ہوں", "ایمرجنسی", "کوئی اور وجہ"];

const beep = () => {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    [0, 0.35, 0.7].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 920;
      g.gain.value = 0.35;
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.22);
    });
  } catch { /* blocked */ }
};

const RiderOfferCard = ({ riderId, onChanged }: Props) => {
  const [offer, setOffer] = useState<DeliveryOffer | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [askReason, setAskReason] = useState(false);
  const onChangedRef = useRef(onChanged);
  const alertedOfferRef = useRef<string | null>(null);
  onChangedRef.current = onChanged;

  const fetchOffer = async () => {
    const { data, error } = await (supabase as any)
      .from("delivery_offers")
      .select("id,order_id,order_kind,pickup_name,dropoff_address,total_amount,delivery_fee,distance_km,expires_at,created_at")
      .eq("rider_id", riderId)
      .eq("status", "offered")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return;
    const next = data as DeliveryOffer | null;
    setOffer(next);
    if (next && alertedOfferRef.current !== next.id) {
      alertedOfferRef.current = next.id;
      setAskReason(false);
      try { navigator.vibrate?.([500, 150, 500, 150, 700]); } catch { /* unsupported */ }
      beep();
    }
  };

  useEffect(() => {
    fetchOffer();
    const interval = window.setInterval(fetchOffer, 3000);
    const timer = window.setInterval(() => setNow(Date.now()), 500);
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

  // Keep ringing every 5s while offer is open
  useEffect(() => {
    if (!offer) return;
    const r = window.setInterval(() => { beep(); try { navigator.vibrate?.([300, 100, 300]); } catch { /* */ } }, 5000);
    return () => window.clearInterval(r);
  }, [offer?.id]);

  const total = offer ? Math.max(1, (new Date(offer.expires_at).getTime() - new Date(offer.created_at).getTime()) / 1000) : 30;
  const secondsLeft = useMemo(() => {
    if (!offer) return 0;
    return Math.max(0, Math.ceil((new Date(offer.expires_at).getTime() - now) / 1000));
  }, [offer, now]);

  useEffect(() => {
    if (offer && secondsLeft === 0) {
      setOffer(null);
      toast.warning("آفر کا وقت ختم — مسلسل 3 آفر چھوٹنے پر 5 منٹ کا وقفہ لگ جاتا ہے");
      onChangedRef.current();
      fetchOffer();
    }
  }, [offer, secondsLeft]);

  const accept = async () => {
    if (!offer || busy) return;
    setBusy(true);
    const { error } = await supabase.rpc("accept_delivery_offer", { _offer_id: offer.id });
    if (error) toast.error(error.message); else toast.success("آرڈر آپ کو مل گیا ✅ — ریسٹورنٹ کی طرف روانہ ہوں");
    setOffer(null); setBusy(false);
    onChangedRef.current(); fetchOffer();
  };

  const decline = async (reason: string) => {
    if (!offer || busy) return;
    setBusy(true);
    const { error } = await (supabase.rpc as any)("decline_delivery_offer", { _offer_id: offer.id, _reason: reason });
    if (error) toast.error(error.message); else toast.success("آفر چھوڑ دی گئی");
    setOffer(null); setBusy(false); setAskReason(false);
    onChangedRef.current(); fetchOffer();
  };

  if (!offer || secondsLeft === 0) return null;

  const R = 44;
  const C = 2 * Math.PI * R;
  const pct = Math.min(1, secondsLeft / total);
  const earning = Math.round(Number(offer.delivery_fee || 0));

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background/95 backdrop-blur-sm">
      <div className="flex items-center gap-2 bg-primary px-4 py-3 text-primary-foreground">
        <PackageCheck className="h-5 w-5" />
        <p className="font-extrabold">نیا آرڈر — {kindLabel[offer.order_kind] || "ڈیلیوری"}</p>
      </div>

      <div className="flex flex-1 flex-col items-center gap-4 overflow-y-auto p-5">
        <div className="relative h-28 w-28">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r={R} className="fill-none stroke-muted" strokeWidth="8" />
            <circle cx="50" cy="50" r={R} className={`fill-none ${secondsLeft <= 10 ? "stroke-destructive" : "stroke-primary"} transition-all`} strokeWidth="8" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black">{secondsLeft}</span>
            <span className="text-[10px] text-muted-foreground">سیکنڈ</span>
          </div>
        </div>

        <div className="grid w-full max-w-md grid-cols-2 gap-2">
          <div className="rounded-xl border bg-primary/10 p-3 text-center">
            <Wallet className="mx-auto h-5 w-5 text-primary" />
            <p className="mt-1 text-[11px] text-muted-foreground">آپ کی کمائی</p>
            <p className="text-xl font-black text-primary">Rs {earning}</p>
          </div>
          <div className="rounded-xl border bg-card p-3 text-center">
            <Banknote className="mx-auto h-5 w-5" />
            <p className="mt-1 text-[11px] text-muted-foreground">کسٹمر سے وصولی</p>
            <p className="text-xl font-black">Rs {Math.round(Number(offer.total_amount || 0))}</p>
          </div>
        </div>

        <div className="w-full max-w-md space-y-2">
          <div className="rounded-xl border bg-card p-3">
            <p className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground"><Store className="h-3.5 w-3.5" /> پک اَپ · {offer.distance_km == null ? "فاصلہ نامعلوم" : `${Number(offer.distance_km).toFixed(1)} کلومیٹر دور`}</p>
            <p className="mt-1 font-extrabold">{offer.pickup_name || "دکان / ریسٹورنٹ"}</p>
          </div>
          <div className="rounded-xl border bg-card p-3">
            <p className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> ڈراپ آف</p>
            <p className="mt-1 font-bold">{offer.dropoff_address || "پتہ دستیاب نہیں"}</p>
          </div>
        </div>

        {askReason && (
          <div className="w-full max-w-md space-y-2 rounded-xl border bg-card p-3">
            <p className="text-sm font-extrabold">چھوڑنے کی وجہ؟</p>
            <div className="grid grid-cols-2 gap-2">
              {DECLINE_REASONS.map((r) => (
                <Button key={r} variant="outline" size="sm" disabled={busy} onClick={() => decline(r)} className="text-xs">{r}</Button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 border-t bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button variant="outline" disabled={busy} onClick={() => setAskReason((v) => !v)} className="h-14 font-extrabold">
          <X className="h-4 w-4" /> چھوڑیں
        </Button>
        <Button disabled={busy} onClick={accept} className="col-span-2 h-14 text-lg font-black">قبول کریں</Button>
      </div>
    </div>
  );
};

export default RiderOfferCard;
