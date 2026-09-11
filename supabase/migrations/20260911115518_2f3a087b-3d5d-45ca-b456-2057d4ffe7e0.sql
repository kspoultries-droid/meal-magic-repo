CREATE OR REPLACE FUNCTION public.dispatch_next_rider(_kind text, _order_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  _city uuid; _lat double precision; _lng double precision;
  _fee numeric := 0; _total numeric; _addr text; _pickup text;
  _rider_assigned uuid; _status text;
  _auto boolean; _maxkm numeric; _maxoffers integer;
  _tries integer; _rider uuid; _dist numeric; _offer uuid;
  _weight numeric := 0; _mode text; _secs integer;
  _max_active constant integer := 2;
BEGIN
  IF _kind = 'food' THEN
    SELECT o.city_id, o.delivery_lat, o.delivery_lng, o.delivery_fee, o.total_amount, o.delivery_address, o.rider_id, o.status, r.name,
           COALESCE(o.billable_weight_kg,0), o.delivery_mode_calc
      INTO _city,_lat,_lng,_fee,_total,_addr,_rider_assigned,_status,_pickup,_weight,_mode
    FROM public.orders o LEFT JOIN public.restaurants r ON r.id = o.restaurant_id
    WHERE o.id = _order_id FOR UPDATE OF o;
  ELSIF _kind = 'grocery_cart' THEN
    SELECT o.city_id, o.delivery_lat, o.delivery_lng, o.delivery_fee, o.total_amount, o.delivery_address, o.rider_id, o.status, s.name,
           COALESCE(o.billable_weight_kg,0), o.delivery_mode_calc
      INTO _city,_lat,_lng,_fee,_total,_addr,_rider_assigned,_status,_pickup,_weight,_mode
    FROM public.grocery_cart_orders o LEFT JOIN public.grocery_stores s ON s.id = o.store_id
    WHERE o.id = _order_id FOR UPDATE OF o;
  ELSIF _kind = 'grocery_list' THEN
    SELECT s.city_id, o.delivery_lat, o.delivery_lng, o.delivery_fee, o.total_amount, o.delivery_address, o.rider_id, o.status, s.name, 0, NULL
      INTO _city,_lat,_lng,_fee,_total,_addr,_rider_assigned,_status,_pickup,_weight,_mode
    FROM public.grocery_list_orders o LEFT JOIN public.grocery_stores s ON s.id = o.store_id
    WHERE o.id = _order_id FOR UPDATE OF o;
  ELSE
    RETURN NULL;
  END IF;

  IF _rider_assigned IS NOT NULL OR _status IS NULL OR _status IN ('delivered','cancelled','completed') OR _mode IN ('courier','intercity') THEN
    RETURN NULL;
  END IF;

  SELECT c.auto_dispatch, c.max_dispatch_km, c.max_offers_before_stuck
    INTO _auto,_maxkm,_maxoffers FROM public.cities c WHERE c.id = _city;
  IF _auto IS DISTINCT FROM true THEN RETURN NULL; END IF;

  IF EXISTS (
    SELECT 1 FROM public.delivery_offers
    WHERE order_id=_order_id AND order_kind=_kind AND status='offered' AND expires_at > now()
  ) THEN RETURN NULL; END IF;

  UPDATE public.delivery_offers
     SET status='expired', responded_at=COALESCE(responded_at,now()), updated_at=now()
   WHERE order_id=_order_id AND order_kind=_kind AND status='offered' AND expires_at <= now();

  SELECT count(DISTINCT rider_id) INTO _tries
  FROM public.delivery_offers
  WHERE order_id=_order_id AND order_kind=_kind;

  IF _tries >= LEAST(COALESCE(_maxoffers,3),3) THEN
    IF _kind='food' THEN UPDATE public.orders SET dispatch_state='stuck' WHERE id=_order_id;
    ELSIF _kind='grocery_cart' THEN UPDATE public.grocery_cart_orders SET dispatch_state='stuck' WHERE id=_order_id;
    ELSE UPDATE public.grocery_list_orders SET dispatch_state='stuck' WHERE id=_order_id; END IF;
    RETURN NULL;
  END IF;

  SELECT rd.id,
         CASE WHEN _lat IS NULL THEN NULL ELSE public.haversine_km(rd.current_lat, rd.current_lng, _lat, _lng) END
    INTO _rider, _dist
  FROM public.riders rd
  LEFT JOIN public.vehicle_types vt ON vt.id = rd.vehicle_type_id
  WHERE rd.is_available = true
    AND rd.is_suspended = false
    AND rd.current_lat IS NOT NULL AND rd.current_lng IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id=rd.id AND ur.role='rider')
    AND (rd.city_id = _city OR rd.city_id IS NULL OR _city IS NULL)
    AND COALESCE(rd.capacity_kg, vt.capacity_kg, 15) >= _weight
    AND NOT EXISTS (
      SELECT 1 FROM public.delivery_offers dof
      WHERE dof.order_id=_order_id AND dof.order_kind=_kind AND dof.rider_id=rd.id
    )
    AND (
      (SELECT count(*) FROM public.orders o2 WHERE o2.rider_id=rd.id AND o2.status IN ('ready','delivering','out_for_delivery'))
      + (SELECT count(*) FROM public.grocery_cart_orders o3 WHERE o3.rider_id=rd.id AND o3.status IN ('ready','delivering','out_for_delivery'))
      + (SELECT count(*) FROM public.grocery_list_orders o4 WHERE o4.rider_id=rd.id AND o4.status IN ('ready','delivering','out_for_delivery'))
    ) < _max_active
    AND (_lat IS NULL OR public.haversine_km(rd.current_lat, rd.current_lng, _lat, _lng) <= COALESCE(_maxkm,15))
  ORDER BY
    ((CASE WHEN _lat IS NULL THEN 50 ELSE public.haversine_km(rd.current_lat, rd.current_lng, _lat, _lng) END)
      - (COALESCE(rd.rating,5) - 3) * 0.6
      - (COALESCE(rd.acceptance_rate,1) - 0.5) * 1.5) ASC
  LIMIT 1;

  IF _rider IS NULL THEN
    IF _kind='food' THEN UPDATE public.orders SET dispatch_state='stuck' WHERE id=_order_id;
    ELSIF _kind='grocery_cart' THEN UPDATE public.grocery_cart_orders SET dispatch_state='stuck' WHERE id=_order_id;
    ELSE UPDATE public.grocery_list_orders SET dispatch_state='stuck' WHERE id=_order_id; END IF;
    RETURN NULL;
  END IF;

  _secs := CASE WHEN _tries = 0 THEN 20 ELSE 40 END;
  BEGIN
    INSERT INTO public.delivery_offers (order_id, order_kind, rider_id, distance_km, pickup_name, dropoff_address, total_amount, delivery_fee, expires_at)
    VALUES (_order_id, _kind, _rider, _dist, _pickup, _addr, _total, COALESCE(_fee,0), now() + make_interval(secs => _secs))
    RETURNING id INTO _offer;
  EXCEPTION WHEN unique_violation THEN
    RETURN NULL;
  END;

  IF _kind='food' THEN UPDATE public.orders SET dispatch_state='searching' WHERE id=_order_id;
  ELSIF _kind='grocery_cart' THEN UPDATE public.grocery_cart_orders SET dispatch_state='searching' WHERE id=_order_id;
  ELSE UPDATE public.grocery_list_orders SET dispatch_state='searching' WHERE id=_order_id; END IF;
  RETURN _offer;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.escalate_stale_offers()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE _r record; _n integer := 0;
BEGIN
  FOR _r IN
    SELECT id, order_kind, order_id FROM public.delivery_offers
    WHERE status='offered' AND expires_at < now()
    ORDER BY expires_at
    LIMIT 200
  LOOP
    UPDATE public.delivery_offers
       SET status='expired', responded_at=COALESCE(responded_at,now()), updated_at=now()
     WHERE id=_r.id AND status='offered';
    IF FOUND THEN
      PERFORM public.dispatch_next_rider(_r.order_kind, _r.order_id);
      _n := _n + 1;
    END IF;
  END LOOP;

  FOR _r IN
    SELECT o.id AS order_id, 'food'::text AS order_kind
    FROM public.orders o
    WHERE o.rider_id IS NULL AND o.dispatch_state='stuck'
      AND o.status IN ('confirmed','preparing','ready')
      AND o.created_at > now() - interval '2 hours'
      AND (SELECT count(DISTINCT d.rider_id) FROM public.delivery_offers d WHERE d.order_kind='food' AND d.order_id=o.id) < 3
      AND NOT EXISTS (SELECT 1 FROM public.delivery_offers d WHERE d.order_kind='food' AND d.order_id=o.id AND d.status='offered' AND d.expires_at > now())
    UNION ALL
    SELECT o.id, 'grocery_cart'::text
    FROM public.grocery_cart_orders o
    WHERE o.rider_id IS NULL AND o.dispatch_state='stuck'
      AND o.status NOT IN ('delivered','cancelled','completed')
      AND o.created_at > now() - interval '2 hours'
      AND (SELECT count(DISTINCT d.rider_id) FROM public.delivery_offers d WHERE d.order_kind='grocery_cart' AND d.order_id=o.id) < 3
      AND NOT EXISTS (SELECT 1 FROM public.delivery_offers d WHERE d.order_kind='grocery_cart' AND d.order_id=o.id AND d.status='offered' AND d.expires_at > now())
    LIMIT 50
  LOOP
    PERFORM public.dispatch_next_rider(_r.order_kind, _r.order_id);
  END LOOP;

  RETURN _n;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.retry_order_dispatch(_kind text, _order_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support')) THEN
    RAISE EXCEPTION 'اجازت نہیں';
  END IF;

  UPDATE public.delivery_offers
     SET status='expired', responded_at=COALESCE(responded_at,now()), updated_at=now()
   WHERE order_kind=_kind AND order_id=_order_id AND status='offered';

  IF _kind='food' THEN
    UPDATE public.orders SET dispatch_state='none' WHERE id=_order_id AND rider_id IS NULL;
  ELSIF _kind='grocery_cart' THEN
    UPDATE public.grocery_cart_orders SET dispatch_state='none' WHERE id=_order_id AND rider_id IS NULL;
  ELSIF _kind='grocery_list' THEN
    UPDATE public.grocery_list_orders SET dispatch_state='none' WHERE id=_order_id AND rider_id IS NULL;
  ELSE
    RAISE EXCEPTION 'غلط آرڈر قسم';
  END IF;

  RETURN public.dispatch_next_rider(_kind,_order_id);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.admin_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  _today timestamptz := date_trunc('day', now() AT TIME ZONE 'Asia/Karachi') AT TIME ZONE 'Asia/Karachi';
  _res jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT jsonb_build_object(
    'food_today', (SELECT count(*) FROM public.orders WHERE created_at >= _today),
    'grocery_today', (SELECT count(*) FROM public.grocery_cart_orders WHERE created_at >= _today) + (SELECT count(*) FROM public.grocery_list_orders WHERE created_at >= _today),
    'gross_today', COALESCE((SELECT sum(total_amount) FROM public.orders WHERE created_at >= _today AND status <> 'cancelled'),0) + COALESCE((SELECT sum(total_amount) FROM public.grocery_cart_orders WHERE created_at >= _today AND status <> 'cancelled'),0),
    'commission_today', COALESCE((SELECT sum(commission) FROM public.platform_commissions WHERE created_at >= _today),0),
    'pending_orders', (SELECT count(*) FROM public.orders WHERE status IN ('pending','confirmed','preparing','ready','delivering','out_for_delivery')) + (SELECT count(*) FROM public.grocery_cart_orders WHERE status IN ('pending','confirmed','preparing','ready','delivering','out_for_delivery')),
    'stuck_orders', (SELECT count(*) FROM public.orders WHERE dispatch_state='stuck' AND status NOT IN ('delivered','cancelled','completed')) + (SELECT count(*) FROM public.grocery_cart_orders WHERE dispatch_state='stuck' AND status NOT IN ('delivered','cancelled','completed')),
    'unassigned_orders', (SELECT count(*) FROM public.orders WHERE rider_id IS NULL AND status IN ('confirmed','preparing','ready')),
    'riders_online', (SELECT count(*) FROM public.riders r WHERE r.is_available=true AND r.is_suspended=false AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id=r.id AND ur.role='rider')),
    'riders_present', (SELECT count(*) FROM public.riders r WHERE r.is_available=true AND r.is_suspended=false AND r.last_seen_at > now()-interval '3 minutes' AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id=r.id AND ur.role='rider')),
    'riders_total', (SELECT count(*) FROM public.riders r WHERE EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id=r.id AND ur.role='rider')),
    'shops_closed', (SELECT count(*) FROM public.restaurants WHERE is_active=false OR busy_until > now()),
    'shops_total', (SELECT count(*) FROM public.restaurants),
    'pending_applications', (SELECT count(*) FROM public.partner_applications WHERE status='pending'),
    'pending_remittances', (SELECT count(*) FROM public.rider_remittances WHERE status='pending'),
    'pending_payouts', (SELECT count(*) FROM public.payouts WHERE status='pending'),
    'cancelled_today', (SELECT count(*) FROM public.orders WHERE created_at >= _today AND status='cancelled')
  ) INTO _res;
  RETURN _res;
END;
$fn$;

REVOKE ALL ON FUNCTION public.dispatch_next_rider(text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_next_rider(text,uuid) TO service_role;
REVOKE ALL ON FUNCTION public.escalate_stale_offers() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.escalate_stale_offers() TO service_role;
REVOKE ALL ON FUNCTION public.retry_order_dispatch(text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.retry_order_dispatch(text,uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_overview() TO authenticated, service_role;

SELECT public.escalate_stale_offers();