DROP VIEW IF EXISTS public.public_order_reviews;
DROP VIEW IF EXISTS public.public_service_reviews;

-- Allow reading ONLY the city column of riders (column-level grant) for availability counts
GRANT SELECT (city_id) ON public.riders TO anon, authenticated;

CREATE POLICY "riders_city_visible_for_counts" ON public.riders
  FOR SELECT TO anon, authenticated
  USING (true);

DROP VIEW IF EXISTS public.city_rider_counts;
CREATE VIEW public.city_rider_counts
WITH (security_invoker = on) AS
  SELECT city_id, COUNT(*)::int AS rider_count
  FROM public.riders
  WHERE city_id IS NOT NULL
  GROUP BY city_id;

GRANT SELECT ON public.city_rider_counts TO anon, authenticated;