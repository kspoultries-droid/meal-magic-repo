ALTER TABLE public.delivery_offers ADD COLUMN IF NOT EXISTS is_batch boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.dispatch_next_rider(_kind text, _order_id uuid)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _city uuid; _lat double precision; _lng double precision;
  _plat double precision; _plng double precision;
  _fee numeric := 0; _total numeric; _addr text; _pickup text;
  _rider_assigned uuid; _status text;
  _auto boolean; _maxkm numeric; _maxoffers integer;
  _tries integer; _rider uuid; _dist numeric; _offer uuid;
  _weight numeric := 0; _mode text; _secs integer;
  _busy_exists boolean := false;
  _created timestamptz;
  _pm text := 'cod';
  _cod_add numeric := 0;
  _cash_limit numeric;
  _rest uuid; _ready timestamptz; _batch boolean := false;
  _max_active constant integer := 2;
BEGIN
  IF _kind = 'food' THEN
    SELECT o.city_id, o.delivery_lat, o.delivery_lng, o.delivery_fee, o.total_amount, o.delivery_address, o.rider_id, o.status, r.name,
           COALESCE(o.billable_weight_kg,0), o.delivery_mode_calc, o.created_at, lower(COALESCE(o.payment_method,'cod')),
           r.pickup_lat, r.pickup_lng, o.restaurant_id,
           COALESCE(o.ready_at, COALESCE(o.accepted_at, o.created_at) + make_interval(mins => COALESCE(o.prep_minutes,15)))
      INTO _city,_lat,_lng,_fee,_total,_addr,_rider_assigned,_status,_pickup,_weight,_mode,_created,_pm,_plat,_plng,_rest,_ready
    FROM public.orders o LEFT JOIN public.restaurants r ON r.id = o.restaurant_id
    WHERE o.id = _order_id FOR UPDATE OF o;
  ELSIF _kind = 'grocery_cart' THEN
    SELECT o.city_id, o.delivery_lat, o.delivery_lng, o.delivery_fee, o.total_amount, o.delivery_address, o.rider_id, o.status, s.name,
           COALESCE(o.billable_weight_kg,0), o.delivery_mode_calc, o.created_at, lower(COALESCE(o.payment_method,'cod'))
      INTO _city,_lat,_lng,_fee,_total,_addr,_rider_assigned,_status,_pickup,_weight,_mode,_created,_pm
    FROM public.grocery_cart_orders o LEFT JOIN public.grocery_stores s ON s.id = o.store_id
    WHERE o.id = _order_id FOR UPDATE OF o;
  ELSIF _kind = 'grocery_list' THEN
    SELECT s.city_id, o.delivery_lat, o.delivery_lng, o.delivery_fee, o.total_amount, o.delivery_address, o.rider_id, o.status, s.name, 0, NULL, o.created_at, 'cod'
      INTO _city,_lat,_lng,_fee,_total,_addr,_rider_assigned,_status,_pickup,_weight,_mode,_created,_pm
    FROM public.grocery_list_orders o LEFT JOIN public.grocery_stores s ON s.id = o.store_id
    WHERE o.id = _order_id FOR UPDATE OF o;
  ELSE
    RETURN NULL;
  END IF;

  IF _rider_assigned IS NOT NULL OR _status IS NULL OR _status IN ('delivered','cancelled','completed') OR _mode IN ('courier','intercity') THEN
    RETURN NULL;
  END IF;

  IF _plat IS NULL OR _plng IS NULL THEN _plat := _lat; _plng := _lng; END IF;

  SELECT c.auto_dispatch, c.max_dispatch_km, c.max_offers_before_stuck
    INTO _auto,_maxkm,_maxoffers FROM public.cities c WHERE c.id = _city;
  IF _auto IS DISTINCT FROM true THEN RETURN NULL; END IF;

  IF EXISTS (
    SELECT 1 FROM public.delivery_offers
    WHERE order_id=_order_id AND order_kind=_kind AND status='offered' AND expires_at > now()
  ) THEN RETURN NULL; END IF;

  -- Kitchen prep sync: don't call a rider until food is ~8 minutes from ready
  IF _kind = 'food' AND _ready IS NOT NULL AND _ready > now() + interval '8 minutes' THEN
    UPDATE public.orders SET dispatch_state='searching' WHERE id=_order_id AND COALESCE(dispatch_state,'none') <> 'searching';
    RETURN NULL;
  END IF;

  UPDATE public.delivery_offers
     SET status='expired', responded_at=COALESCE(responded_at,now()), updated_at=now()
   WHERE order_id=_order_id AND order_kind=_kind AND status='offered' AND expires_at <= now();

  SELECT count(DISTINCT rider_id) INTO _tries
  FROM public.delivery_offers WHERE order_id=_order_id AND order_kind=_kind;

  IF _tries >= LEAST(COALESCE(_maxoffers,3),3) THEN
    IF _kind='food' THEN UPDATE public.orders SET dispatch_state='stuck' WHERE id=_order_id;
    ELSIF _kind='grocery_cart' THEN UPDATE public.grocery_cart_orders SET dispatch_state='stuck' WHERE id=_order_id;
    ELSE UPDATE public.grocery_list_orders SET dispatch_state='stuck' WHERE id=_order_id; END IF;
    RETURN NULL;
  END IF;

  _cash_limit := public.rider_cash_limit();
  _cod_add := CASE WHEN _pm = 'cod' THEN COALESCE(_total,0) ELSE 0 END;

  -- Smart batching: same restaurant, rider not yet picked up, first order not old,
  -- both ready within 5 minutes of each other, drop-offs within 3 km. Never delays the first customer.
  IF _kind = 'food' AND _rest IS NOT NULL THEN
    SELECT rd.id, public.haversine_km(rd.current_lat, rd.current_lng, _plat, _plng)
      INTO _rider, _dist
    FROM public.orders o1
    JOIN public.riders rd ON rd.id = o1.rider_id
    WHERE o1.restaurant_id = _rest
      AND o1.id <> _order_id
      AND o1.status IN ('confirmed','preparing')
      AND o1.picked_up_at IS NULL
      AND o1.created_at > now() - interval '25 minutes'
      AND abs(extract(epoch FROM (
            COALESCE(o1.ready_at, COALESCE(o1.accepted_at, o1.created_at) + make_interval(mins => COALESCE(o1.prep_minutes,15)))
            - _ready))) <= 300
      AND (_lat IS NULL OR o1.delivery_lat IS NULL OR public.haversine_km(o1.delivery_lat, o1.delivery_lng, _lat, _lng) <= 3)
      AND rd.is_available = true AND rd.is_suspended = false
      AND (rd.break_until IS NULL OR rd.break_until <= now())
      AND rd.current_lat IS NOT NULL
      AND (_cod_add = 0 OR public.rider_cash_outstanding(rd.id) + _cod_add <= _cash_limit)
      AND NOT EXISTS (SELECT 1 FROM public.delivery_offers d WHERE d.order_id=_order_id AND d.order_kind=_kind AND d.rider_id=rd.id)
      AND NOT EXISTS (SELECT 1 FROM public.delivery_offers d2 WHERE d2.rider_id=rd.id AND d2.status='offered' AND d2.expires_at > now())
      AND (SELECT count(*) FROM public.orders o2 WHERE o2.rider_id=rd.id AND o2.status NOT IN ('delivered','cancelled','completed')) < 3
    ORDER BY o1.created_at ASC
    LIMIT 1;
    IF _rider IS NOT NULL THEN _batch := true; END IF;
  END IF;

  IF _rider IS NULL THEN
    SELECT rd.id,
           CASE WHEN _plat IS NULL THEN NULL ELSE public.haversine_km(rd.current_lat, rd.current_lng, _plat, _plng) END
      INTO _rider, _dist
    FROM public.riders rd
    LEFT JOIN public.vehicle_types vt ON vt.id = rd.vehicle_type_id
    WHERE rd.is_available = true
      AND rd.is_suspended = false
      AND (rd.break_until IS NULL OR rd.break_until <= now())
      AND rd.current_lat IS NOT NULL AND rd.current_lng IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id=rd.id AND ur.role='rider')
      AND (rd.city_id = _city OR rd.city_id IS NULL OR _city IS NULL)
      AND COALESCE(rd.capacity_kg, vt.capacity_kg, 15) >= _weight
      AND (_cod_add = 0 OR public.rider_cash_outstanding(rd.id) + _cod_add <= _cash_limit)
      AND NOT EXISTS (SELECT 1 FROM public.delivery_offers dof WHERE dof.order_id=_order_id AND dof.order_kind=_kind AND dof.rider_id=rd.id)
      AND NOT EXISTS (SELECT 1 FROM public.delivery_offers dof2 WHERE dof2.rider_id=rd.id AND dof2.status='offered' AND dof2.expires_at > now())
      AND (
        (SELECT count(*) FROM public.orders o2 WHERE o2.rider_id=rd.id AND o2.status NOT IN ('delivered','cancelled','completed'))
        + (SELECT count(*) FROM public.grocery_cart_orders o3 WHERE o3.rider_id=rd.id AND o3.status NOT IN ('delivered','cancelled','completed'))
        + (SELECT count(*) FROM public.grocery_list_orders o4 WHERE o4.rider_id=rd.id AND o4.status NOT IN ('delivered','cancelled','completed'))
      ) < _max_active
      AND (_plat IS NULL OR public.haversine_km(rd.current_lat, rd.current_lng, _plat, _plng) <= COALESCE(_maxkm,15))
    ORDER BY
      ((CASE WHEN _plat IS NULL THEN 50 ELSE public.haversine_km(rd.current_lat, rd.current_lng, _plat, _plng) END)
        - (COALESCE(rd.rating,5) - 3) * 0.6
        - (COALESCE(rd.acceptance_rate,1) - 0.5) * 1.5) ASC
    LIMIT 1;
  END IF;

  IF _rider IS NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.riders rd
      LEFT JOIN public.vehicle_types vt ON vt.id = rd.vehicle_type_id
      WHERE rd.is_available = true AND rd.is_suspended = false
        AND rd.current_lat IS NOT NULL AND rd.current_lng IS NOT NULL
        AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id=rd.id AND ur.role='rider')
        AND (rd.city_id = _city OR rd.city_id IS NULL OR _city IS NULL)
        AND COALESCE(rd.capacity_kg, vt.capacity_kg, 15) >= _weight
        AND NOT EXISTS (SELECT 1 FROM public.delivery_offers dof WHERE dof.order_id=_order_id AND dof.order_kind=_kind AND dof.rider_id=rd.id)
        AND (_plat IS NULL OR public.haversine_km(rd.current_lat, rd.current_lng, _plat, _plng) <= COALESCE(_maxkm,15))
    ) INTO _busy_exists;

    IF _busy_exists AND _created > now() - interval '15 minutes' THEN
      IF _kind='food' THEN UPDATE public.orders SET dispatch_state='searching' WHERE id=_order_id;
      ELSIF _kind='grocery_cart' THEN UPDATE public.grocery_cart_orders SET dispatch_state='searching' WHERE id=_order_id;
      ELSE UPDATE public.grocery_list_orders SET dispatch_state='searching' WHERE id=_order_id; END IF;
      RETURN NULL;
    END IF;

    IF _kind='food' THEN UPDATE public.orders SET dispatch_state='stuck' WHERE id=_order_id;
    ELSIF _kind='grocery_cart' THEN UPDATE public.grocery_cart_orders SET dispatch_state='stuck' WHERE id=_order_id;
    ELSE UPDATE public.grocery_list_orders SET dispatch_state='stuck' WHERE id=_order_id; END IF;
    RETURN NULL;
  END IF;

  _secs := CASE WHEN _tries = 0 THEN 30 ELSE 40 END;
  INSERT INTO public.delivery_offers (order_id, order_kind, rider_id, distance_km, pickup_name, dropoff_address, total_amount, delivery_fee, expires_at, is_batch)
  VALUES (_order_id, _kind, _rider, _dist, _pickup, _addr, _total, COALESCE(_fee,0), now() + make_interval(secs => _secs), _batch)
  RETURNING id INTO _offer;

  IF _kind='food' THEN UPDATE public.orders SET dispatch_state='offered' WHERE id=_order_id;
  ELSIF _kind='grocery_cart' THEN UPDATE public.grocery_cart_orders SET dispatch_state='offered' WHERE id=_order_id;
  ELSE UPDATE public.grocery_list_orders SET dispatch_state='offered' WHERE id=_order_id; END IF;

  RETURN _offer;
END;
$function$;
REVOKE ALL ON FUNCTION public.dispatch_next_rider(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_next_rider(text, uuid) TO service_role;