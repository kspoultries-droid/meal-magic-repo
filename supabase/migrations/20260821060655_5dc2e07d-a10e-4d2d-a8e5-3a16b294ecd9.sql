-- 1. Remove public read access to riders
DROP POLICY IF EXISTS "riders_city_visible_for_counts" ON public.riders;

-- Keep aggregate city counts working for everyone via a definer view
DROP VIEW IF EXISTS public.city_rider_counts;
CREATE VIEW public.city_rider_counts
WITH (security_invoker = off) AS
  SELECT city_id, count(*)::int AS rider_count
  FROM public.riders
  WHERE city_id IS NOT NULL
  GROUP BY city_id;
GRANT SELECT ON public.city_rider_counts TO anon, authenticated;

-- Support staff still need to monitor riders
DROP POLICY IF EXISTS "Support can view riders" ON public.riders;
CREATE POLICY "Support can view riders"
ON public.riders FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'support'));

-- 2. Block anonymous uploads to partner-documents
DROP POLICY IF EXISTS "Anon can upload partner docs" ON storage.objects;
