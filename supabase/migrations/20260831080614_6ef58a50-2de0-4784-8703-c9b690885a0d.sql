CREATE TABLE public.rider_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  order_kind text NOT NULL DEFAULT 'food',
  rider_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, order_kind, customer_id)
);

GRANT SELECT, INSERT, UPDATE ON public.rider_reviews TO authenticated;
GRANT ALL ON public.rider_reviews TO service_role;

ALTER TABLE public.rider_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can read rider reviews"
  ON public.rider_reviews FOR SELECT TO authenticated USING (true);

CREATE POLICY "Customers can add their own rider review"
  ON public.rider_reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can edit their own rider review"
  ON public.rider_reviews FOR UPDATE TO authenticated
  USING (auth.uid() = customer_id) WITH CHECK (auth.uid() = customer_id);

CREATE TRIGGER rider_reviews_updated_at
  BEFORE UPDATE ON public.rider_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.riders
  ADD COLUMN IF NOT EXISTS rating numeric NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS total_reviews integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS offers_received integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS offers_accepted integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS acceptance_rate numeric NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION public.recalc_rider_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _rider uuid;
BEGIN
  _rider := COALESCE(NEW.rider_id, OLD.rider_id);
  UPDATE riders r
     SET rating = COALESCE((SELECT round(avg(rv.rating)::numeric, 2) FROM rider_reviews rv WHERE rv.rider_id = _rider), 5),
         total_reviews = (SELECT count(*) FROM rider_reviews rv WHERE rv.rider_id = _rider)
   WHERE r.id = _rider;
  RETURN NULL;
END;
$$;

CREATE TRIGGER rider_reviews_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.rider_reviews
  FOR EACH ROW EXECUTE FUNCTION public.recalc_rider_rating();

CREATE OR REPLACE FUNCTION public.refresh_rider_acceptance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE riders r
     SET offers_received = (SELECT count(*) FROM delivery_offers d WHERE d.rider_id = NEW.rider_id AND d.status <> 'offered'),
         offers_accepted = (SELECT count(*) FROM delivery_offers d WHERE d.rider_id = NEW.rider_id AND d.status = 'accepted'),
         acceptance_rate = CASE
           WHEN (SELECT count(*) FROM delivery_offers d WHERE d.rider_id = NEW.rider_id AND d.status <> 'offered') = 0 THEN 1
           ELSE round((SELECT count(*) FROM delivery_offers d WHERE d.rider_id = NEW.rider_id AND d.status = 'accepted')::numeric
                    / (SELECT count(*) FROM delivery_offers d WHERE d.rider_id = NEW.rider_id AND d.status <> 'offered')::numeric, 3)
         END
   WHERE r.id = NEW.rider_id;
  RETURN NULL;
END;
$$;

CREATE TRIGGER delivery_offers_acceptance
  AFTER UPDATE OF status ON public.delivery_offers
  FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.refresh_rider_acceptance();

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

  INSERT INTO delivery_offers (order_id, order_kind, rider_id, distance_km, pickup_name, dropoff_address, total_amount, delivery_fee, expires_at)
  VALUES (_order_id, _kind, _rider, _dist, _pickup, _addr, _total, COALESCE(_fee,0), now() + make_interval(secs => COALESCE(_timeout,40)))
  RETURNING id INTO _offer;

  IF _kind='food' THEN UPDATE orders SET dispatch_state='searching' WHERE id=_order_id;
  ELSIF _kind='grocery_cart' THEN UPDATE grocery_cart_orders SET dispatch_state='searching' WHERE id=_order_id;
  ELSE UPDATE grocery_list_orders SET dispatch_state='searching' WHERE id=_order_id; END IF;

  RETURN _offer;
END;
$function$;