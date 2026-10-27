import { useEffect, useRef, useState } from 'react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { freshRiderLocation } from '@/lib/riderLocation';
import { routeNeedsRefresh, routePhase, routePoint, type DeliveryKind, type RoutePoint } from '@/lib/deliveryRoute';
import DeliveryMap from './DeliveryMap';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Maximize2, RefreshCw, Navigation } from 'lucide-react';

type Route = { coordinates: [number, number][]; duration: number; distance: number; phase: string; steps: { instruction: string; name: string; way_points: number[] }[] };
export default function LiveDeliveryRoute({ orderId, kind, stage = 'assigned', audience = 'customer' }: { orderId: string; kind: DeliveryKind; stage?: string; audience?: 'customer' | 'rider' | 'owner' }) {
  const [rider, setRider] = useState<RoutePoint | null>(null);
  const [pickup, setPickup] = useState<RoutePoint | null>(null);
  const [customer, setCustomer] = useState<RoutePoint | null>(null);
  const [route, setRoute] = useState<Route | null>(null);
  const [phase, setPhase] = useState(routePhase(stage));
  const [message, setMessage] = useState('تازہ مقام کا انتظار / Waiting for GPS');
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [retry, setRetry] = useState(0);
  const [updated, setUpdated] = useState<string | null>(null);
  const refreshRef = useRef<() => void>(() => {});

  useEffect(() => {
    let disposed = false, working = false;
    let lastPoint: RoutePoint | null = null, lastRequest = 0, lastPhase: string | null = null;
    setRoute(null); setRider(null); setPickup(null); setCustomer(null);
    const refresh = async () => {
      if (working || document.visibilityState !== 'visible') return;
      working = true;
      try {
        const [context, gps] = await Promise.all([
          supabase.rpc('get_delivery_route_context', { _kind: kind, _order_id: orderId }),
          supabase.rpc('get_delivery_rider_location', { _kind: kind, _order_id: orderId }),
        ]);
        if (disposed) return;
        if (context.error || gps.error) throw new Error('لوکیشن سے رابطہ نہیں ہو رہا / Connection interrupted');
        const c = context.data as { stage: string; pickup_lat: number | null; pickup_lng: number | null; delivery_lat: number | null; delivery_lng: number | null } | null;
        if (!c) { setRoute(null); setRider(null); setMessage('جاری آرڈر دستیاب نہیں / Active order unavailable'); return; }
        const nextPhase = routePhase(c.stage);
        setPhase(nextPhase);
        const p = routePoint(c.pickup_lat, c.pickup_lng), d = routePoint(c.delivery_lat, c.delivery_lng);
        setPickup(p); setCustomer(d);
        const row = gps.data?.[0];
        const fix = row && freshRiderLocation(row.location_updated_at) ? routePoint(row.lat, row.lng) : null;
        setRider(fix); setUpdated(row?.location_updated_at || null);
        if (!nextPhase) { setRoute(null); setMessage('ڈیلیوری زیرِجائزہ / Delivery under review'); return; }
        if (nextPhase !== lastPhase) { setRoute(null); lastPoint = null; lastRequest = 0; lastPhase = nextPhase; }
        if (!fix) { setRoute(null); setMessage('تازہ رائیڈر GPS کا انتظار / Waiting for fresh GPS'); return; }
        if (!(nextPhase === 'pickup' ? p : d)) { setRoute(null); setMessage(nextPhase === 'pickup' ? 'دکان کا نقشہ پن محفوظ نہیں / Pickup pin missing' : 'گاہک کا نقشہ پن محفوظ نہیں / Delivery pin missing'); return; }
        if (!routeNeedsRefresh(fix, lastPoint, Date.now() - lastRequest)) return;
        lastRequest = Date.now(); lastPoint = fix;
        setBusy(true); setMessage('سڑک کا راستہ تلاش ہو رہا / Finding route');
        const { data, error } = await supabase.functions.invoke('delivery-route', { body: { orderId, kind } });
        if (disposed) return;
        if (error) {
          const details = error instanceof FunctionsHttpError ? await error.context.text() : error.message;
          console.error('delivery-route failed:', details);
          throw new Error('سڑک کا راستہ ابھی نہیں ملا / Route unavailable');
        }
        if (!data?.coordinates) { setRoute(null); setMessage('راستہ دستیاب نہیں؛ تازہ GPS یا درست پن درکار / Route unavailable'); return; }
        setRoute(data); setMessage('');
      } catch (error) {
        if (!disposed) { setRoute(null); setMessage(error instanceof Error ? error.message : 'راستہ دستیاب نہیں'); }
      } finally { working = false; if (!disposed) setBusy(false); }
    };
    refreshRef.current = () => void refresh();
    void refresh();
    const timer = window.setInterval(refresh, 10000);
    document.addEventListener('visibilitychange', refresh);
    return () => { disposed = true; clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, [orderId, kind, stage, retry]);

  const target = phase === 'pickup' ? pickup : customer;
  const title = phase === 'pickup' ? 'ریسٹورنٹ / دکان کی طرف · To pickup' : 'گاہک کی طرف · To customer';
  const map = <DeliveryMap destination={target} rider={rider} pickup={pickup} customer={customer} coordinates={route?.coordinates} follow={audience === 'rider'} />;
  return <section className="min-w-0 space-y-2" aria-label="جاری ڈیلیوری کا راستہ">
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs font-bold flex items-center gap-1"><Navigation className="h-4 w-4 text-primary" />{title}</p>
      <div className="flex shrink-0 gap-1">
        <Button variant="ghost" size="icon" aria-label="راستہ تازہ کریں" disabled={busy} onClick={() => setRetry(x => x + 1)}><RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} /></Button>
        <Button variant="ghost" size="icon" aria-label="بڑا نقشہ" onClick={() => setExpanded(true)}><Maximize2 className="h-4 w-4" /></Button>
      </div>
    </div>
    <div className="h-72 overflow-hidden rounded-md border">{map}</div>
    {route ? <p className="text-xs font-bold text-primary" aria-live="polite">{(route.distance / 1000).toFixed(1)} km · تقریباً {Math.max(1, Math.ceil(route.duration / 60))} منٹ / min <span className="font-normal text-muted-foreground">· ٹریفک شامل نہیں / No live traffic</span></p> : <p className="text-xs text-warning" role="status">{message}</p>}
    {audience === 'rider' && route?.steps?.length > 0 && <details className="text-xs"><summary className="cursor-pointer font-bold text-primary">موڑ اور سڑکیں / Directions</summary><ol className="mt-2 max-h-40 overflow-y-auto space-y-2" dir="ltr">{route.steps.map((s, i) => <li key={i}>{i + 1}. {s.instruction}</li>)}</ol></details>}
    {updated && <p className="text-[10px] text-muted-foreground">GPS: {new Date(updated).toLocaleTimeString('en-GB')}</p>}
    <Dialog open={expanded} onOpenChange={setExpanded}><DialogContent className="w-[calc(100%-1rem)] max-w-4xl"><DialogTitle>{title}</DialogTitle><div className="h-[65dvh]">{expanded && map}</div>{route && <p className="text-xs">{(route.distance / 1000).toFixed(1)} km · تقریباً {Math.max(1, Math.ceil(route.duration / 60))} منٹ</p>}</DialogContent></Dialog>
  </section>;
}