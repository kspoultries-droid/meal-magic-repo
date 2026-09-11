-- lovable-cron-fallback-reviewed: 8640 runs/day; rider offer timeouts are 20s/40s, so expiry must be detected within ~10s; no row-change event fires at expiry time.
SELECT cron.unschedule(jobid) FROM cron.job WHERE command ILIKE '%escalate_stale_offers%';
SELECT cron.schedule('escalate-stale-offers-10s', '10 seconds', 'SELECT public.escalate_stale_offers();');

CREATE OR REPLACE FUNCTION public.dispatch_next_rider(_kind text, _order_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _city uuid; _lat double precision; _lng double precision;
  _fee numeric := 0; _total numeric; _addr text; _pickup text;
  _rider_assigned uuid; _status text;
  _auto boolean; _timeout integer; _maxkm numeric; _maxoffers integer;
  _tries integer; _rider uuid; _dist numeric; _offer uuid;
  _weight numeric := 0; _mode text; _secs integer;
BEGIN
  IF _kind = 'food' THEN
    SELECT o.city_id, o.delivery_lat, o.delivery_lng, o.delivery_fee, o.total_amount, o.delivery_address, o.rider_id, o.status, r.name,
           COALESCE(o.billable_weight_kg,0), o.delivery_mode_calc
      INTO _city,_lat,_lng,_fee,_total,_addr,_rider_assigned,_status,_pickup,_weight,_mode
    FROM orders o LEFT JOIN restaurants r ON r.id = o.restaurant_id WHERE o.id = _order_id;
  ELSIF _kind = 'grocery_cart' THEN
    SELECT o.city_id, o.delivery_lat, o.delivery_lng, o.delivery_fee, o.total_amount, o.delivery_address, o.rider_id, o.status, s.name,
           COALESCE(o.billable_weight_kg,0), o.delivery_mode_calc
      INTO _city,_lat,_lng,_fee,_total,_addr,_rider_assigned,_status,_pickup,_weight,_mode
    FROM grocery_cart_orders o LEFT JOIN grocery_stores s ON s.id = o.store_id WHERE o.id = _order_id;
  ELSIF _kind = 'grocery_list' THEN
    SELECT s.city_id, o.delivery_lat, o.delivery_lng, o.delivery_fee, o.total_amount, o.delivery_address, o.rider_id, o.status, s.name,
           0, NULL
      INTO _city,_lat,_lng,_fee,_total,_addr,_rider_assigned,_status,_pickup,_weight,_mode
    FROM grocery_list_orders o LEFT JOIN grocery_stores s ON s.id = o.store_id WHERE o.id = _order_id;
  ELSE
    RETURN NULL;
  END IF;

  IF _rider_assigned IS NOT NULL THEN RETURN NULL; END IF;
  IF _status IS NULL OR _status IN ('delivered','cancelled','completed') THEN RETURN NULL; END IF;
  IF _mode IN ('courier','intercity') THEN RETURN NULL; END IF;

  SELECT c.auto_dispatch, c.offer_timeout_seconds, c.max_dispatch_km, c.max_offers_before_stuck
    INTO _auto,_timeout,_maxkm,_maxoffers
  FROM cities c WHERE c.id = _city;
  IF _auto IS DISTINCT FROM true THEN RETURN NULL; END IF;

  IF EXISTS (SELECT 1 FROM delivery_offers WHERE order_id=_order_id AND order_kind=_kind AND status='offered' AND expires_at > now()) THEN
    RETURN NULL;
  END IF;

  UPDATE delivery_offers
     SET status='expired', updated_at=now()
   WHERE order_id=_order_id AND order_kind=_kind AND status='offered' AND expires_at <= now();

  SELECT count(*) INTO _tries FROM delivery_offers WHERE order_id=_order_id AND order_kind=_kind;

  SELECT rd.id,
         CASE WHEN _lat IS NULL OR rd.current_lat IS NULL THEN NULL
              ELSE haversine_km(rd.current_lat, rd.current_lng, _lat, _lng) END
    INTO _rider, _dist
  FROM riders rd
  LEFT JOIN vehicle_types vt ON vt.id = rd.vehicle_type_id
  WHERE rd.is_available = true
    AND (rd.city_id = _city OR _city IS NULL)
    AND COALESCE(rd.capacity_kg, vt.capacity_kg, 15) >= _weight
    AND NOT EXISTS (
      SELECT 1 FROM delivery_offers dof
      WHERE dof.order_id=_order_id AND dof.order_kind=_kind AND dof.rider_id=rd.id
    )
    AND NOT EXISTS (SELECT 1 FROM orders o2 WHERE o2.rider_id=rd.id AND o2.status IN ('ready','delivering','out_for_delivery'))
    AND NOT EXISTS (SELECT 1 FROM grocery_cart_orders o3 WHERE o3.rider_id=rd.id AND o3.status IN ('ready','delivering','out_for_delivery'))
    AND NOT EXISTS (SELECT 1 FROM grocery_list_orders o4 WHERE o4.rider_id=rd.id AND o4.status IN ('ready','delivering','out_for_delivery'))
    AND (
      _lat IS NULL OR rd.current_lat IS NULL
      OR haversine_km(rd.current_lat, rd.current_lng, _lat, _lng) <= COALESCE(_maxkm,15)
    )
  ORDER BY (
      (CASE WHEN _lat IS NULL OR rd.current_lat IS NULL THEN 50
            ELSE haversine_km(rd.current_lat, rd.current_lng, _lat, _lng) END)
      - (COALESCE(rd.rating,5) - 3) * 0.6
      - (COALESCE(rd.acceptance_rate,1) - 0.5) * 1.5
    ) ASC
  LIMIT 1;

  IF _rider IS NULL OR _tries >= COALESCE(_maxoffers,3) THEN
    IF _kind='food' THEN UPDATE orders SET dispatch_state='stuck' WHERE id=_order_id;
    ELSIF _kind='grocery_cart' THEN UPDATE grocery_cart_orders SET dispatch_state='stuck' WHERE id=_order_id;
    ELSE UPDATE grocery_list_orders SET dispatch_state='stuck' WHERE id=_order_id; END IF;
    RETURN NULL;
  END IF;

  _secs := CASE WHEN _tries = 0 THEN 20 ELSE COALESCE(_timeout,40) END;

  BEGIN
    INSERT INTO delivery_offers (order_id, order_kind, rider_id, distance_km, pickup_name, dropoff_address, total_amount, delivery_fee, expires_at)
    VALUES (_order_id, _kind, _rider, _dist, _pickup, _addr, _total, COALESCE(_fee,0), now() + make_interval(secs => _secs))
    RETURNING id INTO _offer;
  EXCEPTION WHEN unique_violation THEN
    RETURN NULL;
  END;

  IF _kind='food' THEN UPDATE orders SET dispatch_state='searching' WHERE id=_order_id;
  ELSIF _kind='grocery_cart' THEN UPDATE grocery_cart_orders SET dispatch_state='searching' WHERE id=_order_id;
  ELSE UPDATE grocery_list_orders SET dispatch_state='searching' WHERE id=_order_id; END IF;

  RETURN _offer;
END;
$function$;