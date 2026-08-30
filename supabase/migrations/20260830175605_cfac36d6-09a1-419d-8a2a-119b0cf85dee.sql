DROP FUNCTION IF EXISTS public.trigger_auto_dispatch() CASCADE;

CREATE OR REPLACE FUNCTION public.haversine_km(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
RETURNS double precision LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT 6371 * 2 * asin(sqrt(
    power(sin(radians(lat2-lat1)/2),2) +
    cos(radians(lat1))*cos(radians(lat2))*power(sin(radians(lng2-lng1)/2),2)
  ));
$$;

REVOKE ALL ON FUNCTION public.haversine_km(double precision,double precision,double precision,double precision) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.haversine_km(double precision,double precision,double precision,double precision) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.after_order_status_dispatch() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dispatch_next_rider(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.escalate_stale_offers() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.escalate_stale_offers() TO service_role;
GRANT EXECUTE ON FUNCTION public.dispatch_next_rider(text, uuid) TO service_role;