-- 1) dispatch_next_rider: internal-only (called by triggers/cron/admin RPCs)
REVOKE EXECUTE ON FUNCTION public.dispatch_next_rider(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_next_rider(text, uuid) TO service_role;

-- 2) Financial lookup functions: owner or admin/support only
CREATE OR REPLACE FUNCTION public.vendor_payable(_vendor uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() IS DISTINCT FROM _vendor
     AND NOT public.has_role(auth.uid(), 'admin')
     AND NOT public.has_role(auth.uid(), 'support') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN GREATEST(0,
    COALESCE((SELECT SUM(net_payable) FROM public.platform_commissions WHERE vendor_id = _vendor), 0)
    - COALESCE((SELECT SUM(amount) FROM public.payouts WHERE vendor_id = _vendor AND status <> 'cancelled'), 0));
END;
$function$;

CREATE OR REPLACE FUNCTION public.rider_cash_due(_rider uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_due numeric;
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() IS DISTINCT FROM _rider
     AND NOT public.has_role(auth.uid(), 'admin')
     AND NOT public.has_role(auth.uid(), 'support') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  WITH o AS (
    SELECT total_amount, payment_method FROM public.orders
      WHERE rider_id = _rider AND status IN ('delivered','completed')
    UNION ALL
    SELECT total_amount, payment_method FROM public.grocery_cart_orders
      WHERE rider_id = _rider AND status IN ('delivered','completed')
    UNION ALL
    SELECT total_amount, 'cod'::text FROM public.grocery_list_orders
      WHERE rider_id = _rider AND status IN ('delivered','completed')
  ), r AS (
    SELECT COALESCE(SUM(amount) FILTER (WHERE status IN ('approved','pending')), 0) AS settled
    FROM public.rider_remittances WHERE rider_id = _rider
  )
  SELECT GREATEST(0,
    COALESCE((SELECT SUM(total_amount) FROM o WHERE COALESCE(payment_method,'cod')='cod'), 0)
    - (SELECT settled FROM r)) INTO v_due;
  RETURN v_due;
END;
$function$;

CREATE OR REPLACE FUNCTION public.resolve_rider_pay(_rider uuid)
RETURNS rider_pay_plans
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE p public.rider_pay_plans%ROWTYPE; v_city uuid;
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() IS DISTINCT FROM _rider
     AND NOT public.has_role(auth.uid(), 'admin')
     AND NOT public.has_role(auth.uid(), 'support') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT * INTO p FROM public.rider_pay_plans WHERE rider_id = _rider AND is_active LIMIT 1;
  IF p.id IS NOT NULL THEN RETURN p; END IF;
  SELECT city_id INTO v_city FROM public.riders WHERE id = _rider;
  IF v_city IS NOT NULL THEN
    SELECT * INTO p FROM public.rider_pay_plans WHERE rider_id IS NULL AND city_id = v_city AND is_active LIMIT 1;
    IF p.id IS NOT NULL THEN RETURN p; END IF;
  END IF;
  SELECT * INTO p FROM public.rider_pay_plans WHERE rider_id IS NULL AND city_id IS NULL LIMIT 1;
  RETURN p;
END;
$function$;

-- 3) Anon must not execute SECURITY DEFINER trigger functions
REVOKE EXECUTE ON FUNCTION public.guard_grocery_status_transition() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.trg_grocery_materialize_items() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.guard_grocery_status_transition() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_grocery_materialize_items() FROM authenticated;

-- 4) grocery_reviews: drop broad authenticated read; expose non-identifying public view
DROP POLICY IF EXISTS "Signed in users read public grocery review content" ON public.grocery_reviews;

CREATE OR REPLACE VIEW public.grocery_reviews_public
WITH (security_invoker = off) AS
SELECT id, store_id, rating, comment, reply, replied_at,
       photo_urls, video_url, created_at
FROM public.grocery_reviews;

GRANT SELECT ON public.grocery_reviews_public TO authenticated;

-- 5) service_providers: remove anon table access; public view without phone/exact location
DROP POLICY IF EXISTS "Public can view active providers" ON public.service_providers;

CREATE OR REPLACE VIEW public.service_providers_public
WITH (security_invoker = off) AS
SELECT sp.id, sp.name, sp.category_id, sc.name AS category_name, sp.city_id,
       round(sp.latitude::numeric, 2)::float8 AS latitude,
       round(sp.longitude::numeric, 2)::float8 AS longitude,
       sp.address, sp.rating, sp.total_reviews, sp.is_available, sp.is_active,
       sp.bio, sp.image_url
FROM public.service_providers sp
LEFT JOIN public.service_categories sc ON sc.id = sp.category_id
WHERE sp.is_active = true;

GRANT SELECT ON public.service_providers_public TO anon, authenticated;