-- 1. City dispatch settings
ALTER TABLE public.cities
  ADD COLUMN IF NOT EXISTS auto_dispatch boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS offer_timeout_seconds integer NOT NULL DEFAULT 40,
  ADD COLUMN IF NOT EXISTS max_dispatch_km numeric NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS max_offers_before_stuck integer NOT NULL DEFAULT 3;

-- 2. dispatch_state on order tables
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dispatch_state text NOT NULL DEFAULT 'none';
ALTER TABLE public.grocery_cart_orders ADD COLUMN IF NOT EXISTS dispatch_state text NOT NULL DEFAULT 'none';
ALTER TABLE public.grocery_list_orders ADD COLUMN IF NOT EXISTS dispatch_state text NOT NULL DEFAULT 'none';

-- 3. delivery_offers
CREATE TABLE IF NOT EXISTS public.delivery_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  order_kind text NOT NULL CHECK (order_kind IN ('food','grocery_cart','grocery_list')),
  rider_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'offered' CHECK (status IN ('offered','accepted','declined','expired','cancelled')),
  distance_km numeric,
  pickup_name text,
  dropoff_address text,
  total_amount numeric,
  delivery_fee numeric NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.delivery_offers TO authenticated;
GRANT ALL ON public.delivery_offers TO service_role;

ALTER TABLE public.delivery_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Riders see their own offers"
ON public.delivery_offers FOR SELECT TO authenticated
USING (rider_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'support'));

CREATE INDEX IF NOT EXISTS idx_delivery_offers_order ON public.delivery_offers(order_kind, order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_offers_rider_status ON public.delivery_offers(rider_id, status);
CREATE INDEX IF NOT EXISTS idx_delivery_offers_open ON public.delivery_offers(status, expires_at);

CREATE TRIGGER update_delivery_offers_updated_at
BEFORE UPDATE ON public.delivery_offers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. distance helper
CREATE OR REPLACE FUNCTION public.haversine_km(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
RETURNS double precision LANGUAGE sql IMMUTABLE AS $$
  SELECT 6371 * 2 * asin(sqrt(
    power(sin(radians(lat2-lat1)/2),2) +
    cos(radians(lat1))*cos(radians(lat2))*power(sin(radians(lng2-lng1)/2),2)
  ));
$$;

-- 5. core dispatch engine
CREATE OR REPLACE FUNCTION public.dispatch_next_rider(_kind text, _order_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _city uuid; _lat double precision; _lng double precision;
  _fee numeric := 0; _total numeric; _addr text; _pickup text;
  _rider_assigned uuid; _status text;
  _auto boolean; _timeout integer; _maxkm numeric; _maxoffers integer;
  _tries integer; _rider uuid; _dist numeric; _offer uuid;
BEGIN
  IF _kind = 'food' THEN
    SELECT o.city_id, o.delivery_lat, o.delivery_lng, o.delivery_fee, o.total_amount, o.delivery_address, o.rider_id, o.status, r.name
      INTO _city,_lat,_lng,_fee,_total,_addr,_rider_assigned,_status,_pickup
    FROM orders o LEFT JOIN restaurants r ON r.id = o.restaurant_id WHERE o.id = _order_id;
  ELSIF _kind = 'grocery_cart' THEN
    SELECT o.city_id, o.delivery_lat, o.delivery_lng, o.delivery_fee, o.total_amount, o.delivery_address, o.rider_id, o.status, s.name
      INTO _city,_lat,_lng,_fee,_total,_addr,_rider_assigned,_status,_pickup
    FROM grocery_cart_orders o LEFT JOIN grocery_stores s ON s.id = o.store_id WHERE o.id = _order_id;
  ELSIF _kind = 'grocery_list' THEN
    SELECT s.city_id, o.delivery_lat, o.delivery_lng, o.delivery_fee, o.total_amount, o.delivery_address, o.rider_id, o.status, s.name
      INTO _city,_lat,_lng,_fee,_total,_addr,_rider_assigned,_status,_pickup
    FROM grocery_list_orders o LEFT JOIN grocery_stores s ON s.id = o.store_id WHERE o.id = _order_id;
  ELSE
    RETURN NULL;
  END IF;

  IF _rider_assigned IS NOT NULL THEN RETURN NULL; END IF;
  IF _status IS NULL OR _status IN ('delivered','cancelled','completed') THEN RETURN NULL; END IF;

  SELECT c.auto_dispatch, c.offer_timeout_seconds, c.max_dispatch_km, c.max_offers_before_stuck
    INTO _auto,_timeout,_maxkm,_maxoffers
  FROM cities c WHERE c.id = _city;
  IF _auto IS DISTINCT FROM true THEN RETURN NULL; END IF;

  -- an offer is already pending
  IF EXISTS (SELECT 1 FROM delivery_offers WHERE order_id=_order_id AND order_kind=_kind AND status='offered' AND expires_at > now()) THEN
    RETURN NULL;
  END IF;

  SELECT count(*) INTO _tries FROM delivery_offers WHERE order_id=_order_id AND order_kind=_kind;

  SELECT rd.id,
         CASE WHEN _lat IS NULL OR rd.current_lat IS NULL THEN NULL
              ELSE haversine_km(rd.current_lat, rd.current_lng, _lat, _lng) END
    INTO _rider, _dist
  FROM riders rd
  WHERE rd.is_available = true
    AND (rd.city_id = _city OR _city IS NULL)
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
  ORDER BY (CASE WHEN _lat IS NULL OR rd.current_lat IS NULL THEN 999999
                 ELSE haversine_km(rd.current_lat, rd.current_lng, _lat, _lng) END) ASC
  LIMIT 1;

  IF _rider IS NULL OR _tries >= COALESCE(_maxoffers,3) THEN
    IF _kind='food' THEN UPDATE orders SET dispatch_state='stuck' WHERE id=_order_id;
    ELSIF _kind='grocery_cart' THEN UPDATE grocery_cart_orders SET dispatch_state='stuck' WHERE id=_order_id;
    ELSE UPDATE grocery_list_orders SET dispatch_state='stuck' WHERE id=_order_id; END IF;
    RETURN NULL;
  END IF;

  INSERT INTO delivery_offers (order_id, order_kind, rider_id, distance_km, pickup_name, dropoff_address, total_amount, delivery_fee, expires_at)
  VALUES (_order_id, _kind, _rider, _dist, _pickup, _addr, _total, COALESCE(_fee,0), now() + make_interval(secs => COALESCE(_timeout,40)))
  RETURNING id INTO _offer;

  IF _kind='food' THEN UPDATE orders SET dispatch_state='searching' WHERE id=_order_id;
  ELSIF _kind='grocery_cart' THEN UPDATE grocery_cart_orders SET dispatch_state='searching' WHERE id=_order_id;
  ELSE UPDATE grocery_list_orders SET dispatch_state='searching' WHERE id=_order_id; END IF;

  RETURN _offer;
END;
$$;

REVOKE ALL ON FUNCTION public.dispatch_next_rider(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dispatch_next_rider(text, uuid) TO service_role;

-- 6. rider accepts an offer
CREATE OR REPLACE FUNCTION public.accept_delivery_offer(_offer_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _o delivery_offers%ROWTYPE;
BEGIN
  SELECT * INTO _o FROM delivery_offers WHERE id=_offer_id FOR UPDATE;
  IF _o.id IS NULL THEN RAISE EXCEPTION 'آفر موجود نہیں'; END IF;
  IF _o.rider_id <> auth.uid() THEN RAISE EXCEPTION 'یہ آفر آپ کی نہیں'; END IF;
  IF _o.status <> 'offered' OR _o.expires_at < now() THEN RAISE EXCEPTION 'آفر کا وقت ختم ہو چکا'; END IF;

  UPDATE delivery_offers SET status='accepted', responded_at=now() WHERE id=_offer_id;

  IF _o.order_kind='food' THEN
    UPDATE orders SET rider_id=_o.rider_id, dispatch_state='assigned',
      status = CASE WHEN status IN ('pending','confirmed','preparing') THEN status ELSE status END
    WHERE id=_o.order_id AND rider_id IS NULL;
  ELSIF _o.order_kind='grocery_cart' THEN
    UPDATE grocery_cart_orders SET rider_id=_o.rider_id, rider_assigned_at=now(), dispatch_state='assigned'
    WHERE id=_o.order_id AND rider_id IS NULL;
  ELSE
    UPDATE grocery_list_orders SET rider_id=_o.rider_id, rider_assigned_at=now(), dispatch_state='assigned'
    WHERE id=_o.order_id AND rider_id IS NULL;
  END IF;

  UPDATE delivery_offers SET status='cancelled'
  WHERE order_id=_o.order_id AND order_kind=_o.order_kind AND id<>_offer_id AND status='offered';
END;
$$;

REVOKE ALL ON FUNCTION public.accept_delivery_offer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_delivery_offer(uuid) TO authenticated;

-- 7. rider declines
CREATE OR REPLACE FUNCTION public.decline_delivery_offer(_offer_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _o delivery_offers%ROWTYPE;
BEGIN
  SELECT * INTO _o FROM delivery_offers WHERE id=_offer_id FOR UPDATE;
  IF _o.id IS NULL OR _o.rider_id <> auth.uid() THEN RAISE EXCEPTION 'آفر موجود نہیں'; END IF;
  IF _o.status <> 'offered' THEN RETURN; END IF;
  UPDATE delivery_offers SET status='declined', responded_at=now() WHERE id=_offer_id;
  PERFORM dispatch_next_rider(_o.order_kind, _o.order_id);
END;
$$;

REVOKE ALL ON FUNCTION public.decline_delivery_offer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decline_delivery_offer(uuid) TO authenticated;

-- 8. cron worker: expire + move on
CREATE OR REPLACE FUNCTION public.escalate_stale_offers()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _r record; _n integer := 0;
BEGIN
  FOR _r IN
    SELECT id, order_kind, order_id FROM delivery_offers
    WHERE status='offered' AND expires_at < now()
    LIMIT 200
  LOOP
    UPDATE delivery_offers SET status='expired', responded_at=now() WHERE id=_r.id;
    PERFORM dispatch_next_rider(_r.order_kind, _r.order_id);
    _n := _n + 1;
  END LOOP;
  RETURN _n;
END;
$$;

REVOKE ALL ON FUNCTION public.escalate_stale_offers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.escalate_stale_offers() TO service_role;

-- 9. triggers that kick off dispatch
CREATE OR REPLACE FUNCTION public.trigger_auto_dispatch()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _kind text;
BEGIN
  IF NEW.rider_id IS NOT NULL THEN
    IF NEW.dispatch_state <> 'assigned' THEN NEW.dispatch_state := 'assigned'; END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.after_order_status_dispatch()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _kind text;
BEGIN
  _kind := TG_ARGV[0];
  IF NEW.rider_id IS NULL
     AND NEW.status IN ('confirmed','preparing','ready')
     AND NEW.dispatch_state IN ('none','searching')
     AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM dispatch_next_rider(_kind, NEW.id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS auto_dispatch_orders ON public.orders;
CREATE TRIGGER auto_dispatch_orders
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.after_order_status_dispatch('food');

DROP TRIGGER IF EXISTS auto_dispatch_grocery_cart ON public.grocery_cart_orders;
CREATE TRIGGER auto_dispatch_grocery_cart
AFTER INSERT OR UPDATE OF status ON public.grocery_cart_orders
FOR EACH ROW WHEN (NEW.delivery_method IS DISTINCT FROM 'courier')
EXECUTE FUNCTION public.after_order_status_dispatch('grocery_cart');

DROP TRIGGER IF EXISTS auto_dispatch_grocery_list ON public.grocery_list_orders;
CREATE TRIGGER auto_dispatch_grocery_list
AFTER INSERT OR UPDATE OF status ON public.grocery_list_orders
FOR EACH ROW EXECUTE FUNCTION public.after_order_status_dispatch('grocery_list');