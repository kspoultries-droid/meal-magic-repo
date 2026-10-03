CREATE OR REPLACE FUNCTION public.rider_hotspots()
RETURNS TABLE(restaurant_name text, address text, lat double precision, lng double precision, orders_2h bigint, orders_today bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.name, r.pickup_address, r.pickup_lat, r.pickup_lng,
    count(*) FILTER (WHERE o.created_at >= now() - interval '2 hours'),
    count(*)
  FROM orders o JOIN restaurants r ON r.id = o.restaurant_id
  WHERE o.created_at >= date_trunc('day', now())
    AND r.pickup_lat IS NOT NULL
    AND (public.has_role(auth.uid(),'rider') OR public.is_staff(auth.uid()))
  GROUP BY r.id
  ORDER BY 5 DESC, 6 DESC
  LIMIT 10
$$;
REVOKE ALL ON FUNCTION public.rider_hotspots() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rider_hotspots() TO authenticated;