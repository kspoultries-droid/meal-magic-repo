ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_riders_last_seen ON public.riders (last_seen_at DESC);

ALTER TABLE public.riders REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='riders') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.riders;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.rider_heartbeat()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'rider') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  UPDATE public.riders SET last_seen_at = now() WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.rider_heartbeat() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rider_heartbeat() TO authenticated;

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
    'stuck_orders', (SELECT count(*) FROM public.orders WHERE dispatch_state = 'stuck')
      + (SELECT count(*) FROM public.grocery_cart_orders WHERE dispatch_state = 'stuck'),
    'unassigned_orders', (SELECT count(*) FROM public.orders WHERE rider_id IS NULL AND status IN ('confirmed','preparing','ready')),
    'riders_online', (
      SELECT count(*) FROM public.riders r
      WHERE r.is_available = true AND r.is_suspended = false
        AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = r.id AND ur.role = 'rider')
    ),
    'riders_present', (
      SELECT count(*) FROM public.riders r
      WHERE r.is_available = true AND r.is_suspended = false
        AND r.last_seen_at > now() - interval '3 minutes'
        AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = r.id AND ur.role = 'rider')
    ),
    'riders_total', (
      SELECT count(*) FROM public.riders r
      WHERE EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = r.id AND ur.role = 'rider')
    ),
    'shops_closed', (SELECT count(*) FROM public.restaurants WHERE is_active = false OR busy_until > now()),
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
GRANT EXECUTE ON FUNCTION public.admin_overview() TO authenticated;