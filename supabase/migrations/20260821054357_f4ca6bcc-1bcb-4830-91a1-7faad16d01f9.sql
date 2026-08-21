-- 1) Reviews: stop exposing customer_id publicly
DROP POLICY IF EXISTS "order_reviews_public_read" ON public.order_reviews;
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.service_reviews;

CREATE POLICY "order_reviews_own_read" ON public.order_reviews
  FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'));

CREATE POLICY "service_reviews_own_read" ON public.service_reviews
  FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'));

-- Public, anonymised review feeds (no customer_id)
CREATE OR REPLACE VIEW public.public_order_reviews AS
  SELECT id, order_id, restaurant_id, rating, comment, created_at
  FROM public.order_reviews;

CREATE OR REPLACE VIEW public.public_service_reviews AS
  SELECT id, service_id, provider_id, rating, comment, created_at
  FROM public.service_reviews;

GRANT SELECT ON public.public_order_reviews TO anon, authenticated;
GRANT SELECT ON public.public_service_reviews TO anon, authenticated;

-- 2) get_city_services no longer needs SECURITY DEFINER
CREATE OR REPLACE VIEW public.city_rider_counts AS
  SELECT city_id, COUNT(*)::int AS rider_count
  FROM public.riders
  WHERE city_id IS NOT NULL
  GROUP BY city_id;

GRANT SELECT ON public.city_rider_counts TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_city_services()
RETURNS TABLE(id uuid, name text, delivery_fee numeric, food_enabled boolean, grocery_enabled boolean, wholesale_enabled boolean, rider_count integer, food_live boolean, grocery_live boolean, wholesale_live boolean, default_courier text, courier_payment_default text, courier_advance_percent numeric)
LANGUAGE sql
STABLE
SECURITY INVOKER
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
  LEFT JOIN public.city_rider_counts r ON r.city_id = c.id
  ORDER BY c.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_city_services() TO anon, authenticated;