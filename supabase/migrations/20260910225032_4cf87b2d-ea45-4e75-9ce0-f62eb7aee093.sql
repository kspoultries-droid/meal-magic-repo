CREATE OR REPLACE FUNCTION public.admin_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _today timestamptz := date_trunc('day', now());
  _res jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT jsonb_build_object(
    'food_today', (SELECT count(*) FROM public.orders WHERE created_at >= _today),
    'grocery_today', (SELECT count(*) FROM public.grocery_cart_orders WHERE created_at >= _today)
      + (SELECT count(*) FROM public.grocery_list_orders WHERE created_at >= _today),
    'gross_today', COALESCE((SELECT sum(total_amount) FROM public.orders WHERE created_at >= _today AND status <> 'cancelled'), 0)
      + COALESCE((SELECT sum(total_amount) FROM public.grocery_cart_orders WHERE created_at >= _today AND status <> 'cancelled'), 0),
    'commission_today', COALESCE((SELECT sum(commission) FROM public.platform_commissions WHERE created_at >= _today), 0),
    'pending_orders', (SELECT count(*) FROM public.orders WHERE status IN ('pending','confirmed','preparing'))
      + (SELECT count(*) FROM public.grocery_cart_orders WHERE status IN ('pending','confirmed','preparing')),
    'stuck_orders', (SELECT count(*) FROM public.orders WHERE status IN ('pending','confirmed','preparing') AND created_at < now() - interval '45 minutes')
      + (SELECT count(*) FROM public.grocery_cart_orders WHERE status IN ('pending','confirmed','preparing') AND created_at < now() - interval '45 minutes'),
    'unassigned_orders', (SELECT count(*) FROM public.orders WHERE rider_id IS NULL AND status IN ('confirmed','preparing','ready')),
    'riders_online', (SELECT count(*) FROM public.riders WHERE is_available),
    'riders_total', (SELECT count(*) FROM public.riders),
    'shops_closed', (SELECT count(*) FROM public.restaurants WHERE is_active = false),
    'shops_total', (SELECT count(*) FROM public.restaurants),
    'pending_applications', (SELECT count(*) FROM public.partner_applications WHERE status = 'pending'),
    'pending_remittances', (SELECT count(*) FROM public.rider_remittances WHERE status = 'pending'),
    'pending_payouts', (SELECT count(*) FROM public.payouts WHERE status = 'pending'),
    'cancelled_today', (SELECT count(*) FROM public.orders WHERE created_at >= _today AND status = 'cancelled')
  ) INTO _res;

  RETURN _res;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_overview() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_daily_trend(_days integer DEFAULT 30)
RETURNS TABLE(day date, orders_count integer, gross numeric, commission numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  WITH days AS (
    SELECT generate_series(date_trunc('day', now()) - ((GREATEST(_days,1) - 1) * interval '1 day'), date_trunc('day', now()), interval '1 day')::date AS d
  ),
  food AS (
    SELECT created_at::date d, count(*)::int c, COALESCE(sum(total_amount),0) g
    FROM public.orders WHERE status <> 'cancelled' GROUP BY 1
  ),
  groc AS (
    SELECT created_at::date d, count(*)::int c, COALESCE(sum(total_amount),0) g
    FROM public.grocery_cart_orders WHERE status <> 'cancelled' GROUP BY 1
  ),
  comm AS (
    SELECT created_at::date d, COALESCE(sum(commission),0) c FROM public.platform_commissions GROUP BY 1
  )
  SELECT days.d,
         (COALESCE(food.c,0) + COALESCE(groc.c,0))::int,
         (COALESCE(food.g,0) + COALESCE(groc.g,0))::numeric,
         COALESCE(comm.c,0)::numeric
  FROM days
  LEFT JOIN food ON food.d = days.d
  LEFT JOIN groc ON groc.d = days.d
  LEFT JOIN comm ON comm.d = days.d
  ORDER BY days.d;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_daily_trend(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_daily_trend(integer) TO authenticated, service_role;