ALTER TABLE public.delivery_offers ADD COLUMN IF NOT EXISTS decline_reason text;
ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS break_until timestamptz;
ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS consecutive_misses integer NOT NULL DEFAULT 0;

-- Track misses: 3 declines/expiries in a row => 5 minute auto break
CREATE OR REPLACE FUNCTION public.track_rider_offer_response()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IN ('declined','expired') THEN
      UPDATE public.riders
         SET consecutive_misses = consecutive_misses + 1,
             break_until = CASE WHEN consecutive_misses + 1 >= 3 THEN now() + interval '5 minutes' ELSE break_until END
       WHERE id = NEW.rider_id;
      UPDATE public.riders SET consecutive_misses = 0 WHERE id = NEW.rider_id AND consecutive_misses >= 3;
    ELSIF NEW.status = 'accepted' THEN
      UPDATE public.riders SET consecutive_misses = 0, break_until = NULL WHERE id = NEW.rider_id;
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.track_rider_offer_response() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_track_rider_offer_response ON public.delivery_offers;
CREATE TRIGGER trg_track_rider_offer_response AFTER UPDATE OF status ON public.delivery_offers
FOR EACH ROW EXECUTE FUNCTION public.track_rider_offer_response();

-- Decline with reason
DROP FUNCTION IF EXISTS public.decline_delivery_offer(uuid);
CREATE OR REPLACE FUNCTION public.decline_delivery_offer(_offer_id uuid, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _o delivery_offers%ROWTYPE;
BEGIN
  SELECT * INTO _o FROM delivery_offers WHERE id=_offer_id FOR UPDATE;
  IF _o.id IS NULL OR _o.rider_id <> auth.uid() THEN RAISE EXCEPTION 'آفر موجود نہیں'; END IF;
  IF _o.status <> 'offered' THEN RETURN; END IF;
  UPDATE delivery_offers SET status='declined', responded_at=now(), decline_reason=left(_reason,120) WHERE id=_offer_id;
  PERFORM dispatch_next_rider(_o.order_kind, _o.order_id);
END $$;
REVOKE ALL ON FUNCTION public.decline_delivery_offer(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decline_delivery_offer(uuid, text) TO authenticated;

-- Rider can end break early
CREATE OR REPLACE FUNCTION public.rider_end_break()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  UPDATE public.riders SET break_until = NULL, consecutive_misses = 0 WHERE id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.rider_end_break() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rider_end_break() TO authenticated;

-- Step tracking (food): arrived at restaurant / arrived at customer
CREATE OR REPLACE FUNCTION public.rider_mark_step(_order_id uuid, _step text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.orders WHERE id=_order_id AND rider_id=auth.uid()) THEN
    RAISE EXCEPTION 'یہ آرڈر آپ کا نہیں';
  END IF;
  IF _step = 'arrived_pickup' THEN
    UPDATE public.orders SET rider_arrived_at = COALESCE(rider_arrived_at, now()) WHERE id=_order_id;
  ELSIF _step = 'arrived_customer' THEN
    UPDATE public.orders SET arrived_customer_at = COALESCE(arrived_customer_at, now()) WHERE id=_order_id;
  ELSE
    RAISE EXCEPTION 'غلط مرحلہ';
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.rider_mark_step(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rider_mark_step(uuid, text) TO authenticated;

-- Dispatch: distance measured from pickup point, skip riders on break, 30s offers
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
  _max_active constant integer := 2;
BEGIN
  IF _kind = 'food' THEN
    SELECT o.city_id, o.delivery_lat, o.delivery_lng, o.delivery_fee, o.total_amount, o.delivery_address, o.rider_id, o.status, r.name,
           COALESCE(o.billable_weight_kg,0), o.delivery_mode_calc, o.created_at, lower(COALESCE(o.payment_method,'cod')),
           r.pickup_lat, r.pickup_lng
      INTO _city,_lat,_lng,_fee,_total,_addr,_rider_assigned,_status,_pickup,_weight,_mode,_created,_pm,_plat,_plng
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

  -- Rank from the pickup point when known (Foodpanda style), else from the customer
  IF _plat IS NULL OR _plng IS NULL THEN _plat := _lat; _plng := _lng; END IF;

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
  FROM public.delivery_offers WHERE order_id=_order_id AND order_kind=_kind;

  IF _tries >= LEAST(COALESCE(_maxoffers,3),3) THEN
    IF _kind='food' THEN UPDATE public.orders SET dispatch_state='stuck' WHERE id=_order_id;
    ELSIF _kind='grocery_cart' THEN UPDATE public.grocery_cart_orders SET dispatch_state='stuck' WHERE id=_order_id;
    ELSE UPDATE public.grocery_list_orders SET dispatch_state='stuck' WHERE id=_order_id; END IF;
    RETURN NULL;
  END IF;

  _cash_limit := public.rider_cash_limit();
  _cod_add := CASE WHEN _pm = 'cod' THEN COALESCE(_total,0) ELSE 0 END;

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
  INSERT INTO public.delivery_offers (order_id, order_kind, rider_id, distance_km, pickup_name, dropoff_address, total_amount, delivery_fee, expires_at)
  VALUES (_order_id, _kind, _rider, _dist, _pickup, _addr, _total, COALESCE(_fee,0), now() + make_interval(secs => _secs))
  RETURNING id INTO _offer;

  IF _kind='food' THEN UPDATE public.orders SET dispatch_state='offered' WHERE id=_order_id;
  ELSIF _kind='grocery_cart' THEN UPDATE public.grocery_cart_orders SET dispatch_state='offered' WHERE id=_order_id;
  ELSE UPDATE public.grocery_list_orders SET dispatch_state='offered' WHERE id=_order_id; END IF;

  RETURN _offer;
END;
$function$;
REVOKE ALL ON FUNCTION public.dispatch_next_rider(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_next_rider(text, uuid) TO service_role;