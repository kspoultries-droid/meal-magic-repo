ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS location_updated_at timestamptz;
ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS location_accuracy_m double precision;

CREATE OR REPLACE FUNCTION public.publish_rider_location(_lat double precision, _lng double precision, _accuracy double precision)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _at timestamptz := clock_timestamp();
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'rider') THEN RAISE EXCEPTION 'not authorized'; END IF;
 IF _lat IS NULL OR _lng IS NULL OR NOT (_lat BETWEEN -90 AND 90) OR NOT (_lng BETWEEN -180 AND 180) OR _accuracy IS NULL OR NOT (_accuracy BETWEEN 0 AND 200) THEN RAISE EXCEPTION 'invalid GPS fix'; END IF;
 UPDATE public.riders SET current_lat=_lat, current_lng=_lng, location_accuracy_m=_accuracy, location_updated_at=_at, last_seen_at=_at
 WHERE id=auth.uid() AND is_suspended=false;
 IF NOT FOUND THEN RAISE EXCEPTION 'rider unavailable'; END IF;
 RETURN _at;
END $$;
REVOKE ALL ON FUNCTION public.publish_rider_location(double precision,double precision,double precision) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_rider_location(double precision,double precision,double precision) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_delivery_rider_location(_kind text, _order_id uuid)
RETURNS TABLE(rider_name text,rider_phone text,lat double precision,lng double precision,location_updated_at timestamptz,accuracy_m double precision)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 WITH target AS (
 SELECT o.rider_id,o.customer_id,o.status FROM public.orders o WHERE _kind='food' AND o.id=_order_id
 UNION ALL SELECT o.rider_id,o.customer_id,o.status FROM public.grocery_cart_orders o WHERE _kind='grocery_cart' AND o.id=_order_id
 UNION ALL SELECT o.rider_id,o.customer_id,o.status FROM public.grocery_list_orders o WHERE _kind='grocery_list' AND o.id=_order_id
 )
 SELECT p.full_name,p.phone,r.current_lat,r.current_lng,r.location_updated_at,r.location_accuracy_m
 FROM target o JOIN public.riders r ON r.id=o.rider_id LEFT JOIN public.profiles p ON p.id=r.id
 WHERE auth.uid() IS NOT NULL AND o.status NOT IN ('delivered','completed','cancelled','returned_to_store')
 AND (o.customer_id=auth.uid() OR o.rider_id=auth.uid() OR public.has_permission(auth.uid(),'dispatch') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'support'));
$$;
REVOKE ALL ON FUNCTION public.get_delivery_rider_location(text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_delivery_rider_location(text,uuid) TO authenticated, service_role;

COMMENT ON COLUMN public.riders.location_updated_at IS 'Time of the last successfully published GPS fix, separate from app presence heartbeat.';