import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';

const input = z.object({ orderId: z.string().uuid(), kind: z.enum(['food', 'grocery_cart', 'grocery_list']) });
const cache = new Map<string, { at: number; data: unknown }>();
const point = (lat: unknown, lng: unknown) => typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) return reply({ error: 'Unauthorized' }, 401);
    const url = Deno.env.get('SUPABASE_URL');
    const anon = Deno.env.get('SUPABASE_ANON_KEY');
    if (!url || !anon) throw new Error('App configuration missing');
    const client = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
    const { data: claims, error: authError } = await client.auth.getClaims(authorization.slice(7));
    if (authError || !claims?.claims?.sub) return reply({ error: 'Unauthorized' }, 401);
    const parsed = input.safeParse(await req.json());
    if (!parsed.success) return reply({ error: 'Invalid order' }, 400);
    const { kind, orderId } = parsed.data;
    const [context, gps] = await Promise.all([
      client.rpc('get_delivery_route_context', { _kind: kind, _order_id: orderId }),
      client.rpc('get_delivery_rider_location', { _kind: kind, _order_id: orderId }),
    ]);
    if (context.error || gps.error) return reply({ error: context.error?.message || gps.error?.message }, 403);
    if (!context.data) return reply({ error: 'Active order unavailable' }, 403);
    const c = context.data;
    const rider = gps.data?.[0];
    const pickup = ['assigned', 'arrived_pickup'].includes(c.stage);
    const target = pickup ? { lat: c.pickup_lat, lng: c.pickup_lng } : { lat: c.delivery_lat, lng: c.delivery_lng };
    const phase = pickup ? 'pickup' : 'customer';
    if (c.stage === 'return_pending') return reply({ unavailable: 'return_pending', phase });
    if (!point(target.lat, target.lng)) return reply({ unavailable: 'missing_destination', phase });
    const age = Date.now() - Date.parse(rider?.location_updated_at || '');
    if (!rider || !point(rider.lat, rider.lng) || !Number.isFinite(age) || age < -5000 || age > 90000) return reply({ unavailable: 'stale_gps', phase });
    const key = `${kind}:${orderId}:${c.rider_id}:${phase}:${target.lat}:${target.lng}:${rider.lat.toFixed(3)}:${rider.lng.toFixed(3)}`;
    const cached = cache.get(key);
    if (cached && Date.now() - cached.at < 60000) return reply(cached.data);
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    const connectionKey = Deno.env.get('UDC_OPENROUTESERVICE_API_KEY');
    if (!apiKey || !connectionKey) return reply({ error: 'Routing service is not configured' }, 503);
    const query = new URLSearchParams({ start: `${rider.lng},${rider.lat}`, end: `${target.lng},${target.lat}` });
    const response = await fetch(`https://connector-gateway.lovable.dev/udc_openrouteservice/v2/directions/driving-car?${query}`, {
      headers: { Authorization: `Bearer ${apiKey}`, 'X-Connection-Api-Key': connectionKey }, signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      const details = await response.text();
      console.error(`Routing provider failed [${response.status}]: ${details}`);
      return reply({ error: 'Provider request failed', status: response.status, details }, response.status);
    }
    const route = (await response.json()).features?.[0];
    const coordinates = route?.geometry?.coordinates;
    const summary = route?.properties?.summary;
    if (!Array.isArray(coordinates) || coordinates.length < 2 || coordinates.length > 20000 || !coordinates.every((p: unknown[]) => Array.isArray(p) && point(p[1], p[0])) || !Number.isFinite(summary?.distance) || !Number.isFinite(summary?.duration)) return reply({ error: 'Invalid route returned' }, 502);
    const data = { phase, coordinates, distance: summary.distance, duration: summary.duration, calculatedAt: new Date().toISOString(), steps: route.properties.segments?.flatMap((s: { steps?: unknown[] }) => s.steps || []) || [] };
    if (cache.size > 200) cache.clear();
    cache.set(key, { at: Date.now(), data });
    return reply(data);
  } catch (error) {
    return reply({ error: error instanceof Error ? error.message : 'Route unavailable' }, 500);
  }
});