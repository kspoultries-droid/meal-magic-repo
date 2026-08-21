CREATE TABLE IF NOT EXISTS public.city_rider_stats (
  city_id uuid PRIMARY KEY,
  rider_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.city_rider_stats TO anon, authenticated;
GRANT ALL ON public.city_rider_stats TO service_role;
ALTER TABLE public.city_rider_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read city rider counts" ON public.city_rider_stats;
CREATE POLICY "Anyone can read city rider counts"
ON public.city_rider_stats FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.city_rider_stats (city_id, rider_count)
SELECT city_id, count(*)::int FROM public.riders WHERE city_id IS NOT NULL GROUP BY city_id
ON CONFLICT (city_id) DO UPDATE SET rider_count = EXCLUDED.rider_count, updated_at = now();

CREATE OR REPLACE FUNCTION public.refresh_city_rider_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP <> 'INSERT' AND OLD.city_id IS NOT NULL THEN
    INSERT INTO public.city_rider_stats (city_id, rider_count)
    SELECT OLD.city_id, count(*)::int FROM public.riders WHERE city_id = OLD.city_id
    ON CONFLICT (city_id) DO UPDATE SET rider_count = EXCLUDED.rider_count, updated_at = now();
  END IF;
  IF TG_OP <> 'DELETE' AND NEW.city_id IS NOT NULL THEN
    INSERT INTO public.city_rider_stats (city_id, rider_count)
    SELECT NEW.city_id, count(*)::int FROM public.riders WHERE city_id = NEW.city_id
    ON CONFLICT (city_id) DO UPDATE SET rider_count = EXCLUDED.rider_count, updated_at = now();
  END IF;
  RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.refresh_city_rider_stats() FROM anon, authenticated;

DROP TRIGGER IF EXISTS trg_refresh_city_rider_stats ON public.riders;
CREATE TRIGGER trg_refresh_city_rider_stats
AFTER INSERT OR UPDATE OF city_id OR DELETE ON public.riders
FOR EACH ROW EXECUTE FUNCTION public.refresh_city_rider_stats();

CREATE OR REPLACE FUNCTION public.get_city_services()
RETURNS TABLE(id uuid, name text, delivery_fee numeric, food_enabled boolean, grocery_enabled boolean, wholesale_enabled boolean, rider_count integer, food_live boolean, grocery_live boolean, wholesale_live boolean, default_courier text, courier_payment_default text, courier_advance_percent numeric)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT c.id, c.name, c.delivery_fee,
         c.food_enabled, c.grocery_enabled, c.wholesale_enabled,
         COALESCE(r.rider_count, 0)::int AS rider_count,
         (c.food_enabled AND (NOT c.auto_hide_without_rider OR COALESCE(r.rider_count,0) > 0)) AS food_live,
         (c.grocery_enabled AND (NOT c.auto_hide_without_rider OR COALESCE(r.rider_count,0) > 0)) AS grocery_live,
         c.wholesale_enabled AS wholesale_live,
         c.default_courier, c.courier_payment_default, c.courier_advance_percent
  FROM public.cities c
  LEFT JOIN public.city_rider_stats r ON r.city_id = c.id
  ORDER BY c.name;
$$;

DROP VIEW IF EXISTS public.city_rider_counts;