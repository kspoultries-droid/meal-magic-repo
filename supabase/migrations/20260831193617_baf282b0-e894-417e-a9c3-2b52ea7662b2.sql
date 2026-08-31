-- lovable-cron-fallback-reviewed: 1440 runs/day; expired rider offers must advance even when no rider or admin client is open, with at most one minute of additional delay
CREATE UNIQUE INDEX IF NOT EXISTS delivery_offers_one_active_per_order
ON public.delivery_offers (order_kind, order_id)
WHERE status = 'offered';

CREATE OR REPLACE FUNCTION public.accept_delivery_offer(_offer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _o public.delivery_offers%ROWTYPE;
  _claimed integer := 0;
BEGIN
  SELECT * INTO _o
  FROM public.delivery_offers
  WHERE id = _offer_id
  FOR UPDATE;

  IF _o.id IS NULL THEN
    RAISE EXCEPTION 'آفر موجود نہیں';
  END IF;
  IF _o.rider_id <> auth.uid() THEN
    RAISE EXCEPTION 'یہ آفر آپ کی نہیں';
  END IF;
  IF _o.status <> 'offered' OR _o.expires_at < now() THEN
    RAISE EXCEPTION 'آفر کا وقت ختم ہو چکا';
  END IF;

  IF _o.order_kind = 'food' THEN
    UPDATE public.orders
       SET rider_id = _o.rider_id, dispatch_state = 'assigned'
     WHERE id = _o.order_id AND rider_id IS NULL;
  ELSIF _o.order_kind = 'grocery_cart' THEN
    UPDATE public.grocery_cart_orders
       SET rider_id = _o.rider_id, rider_assigned_at = now(), dispatch_state = 'assigned'
     WHERE id = _o.order_id AND rider_id IS NULL;
  ELSE
    UPDATE public.grocery_list_orders
       SET rider_id = _o.rider_id, rider_assigned_at = now(), dispatch_state = 'assigned'
     WHERE id = _o.order_id AND rider_id IS NULL;
  END IF;

  GET DIAGNOSTICS _claimed = ROW_COUNT;
  IF _claimed <> 1 THEN
    UPDATE public.delivery_offers
       SET status = 'cancelled', responded_at = now()
     WHERE id = _offer_id;
    RAISE EXCEPTION 'یہ آرڈر کسی دوسرے رائیڈر کو مل چکا ہے';
  END IF;

  UPDATE public.delivery_offers
     SET status = 'accepted', responded_at = now()
   WHERE id = _offer_id;

  UPDATE public.delivery_offers
     SET status = 'cancelled', responded_at = COALESCE(responded_at, now())
   WHERE order_id = _o.order_id
     AND order_kind = _o.order_kind
     AND id <> _offer_id
     AND status = 'offered';
END;
$$;

REVOKE ALL ON FUNCTION public.accept_delivery_offer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_delivery_offer(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_offer_order_to_rider(
  _kind text,
  _order_id uuid,
  _rider_id uuid,
  _delivery_fee numeric DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _city uuid;
  _lat double precision;
  _lng double precision;
  _current_rider uuid;
  _status text;
  _fee numeric;
  _total numeric;
  _address text;
  _pickup text;
  _timeout integer := 40;
  _distance numeric;
  _offer_id uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support')) THEN
    RAISE EXCEPTION 'اجازت نہیں';
  END IF;

  IF _kind = 'food' THEN
    SELECT o.city_id, o.delivery_lat, o.delivery_lng, o.rider_id, o.status,
           COALESCE(_delivery_fee, o.delivery_fee, 0), o.total_amount, o.delivery_address, r.name
      INTO _city, _lat, _lng, _current_rider, _status, _fee, _total, _address, _pickup
      FROM public.orders o
      LEFT JOIN public.restaurants r ON r.id = o.restaurant_id
     WHERE o.id = _order_id
     FOR UPDATE OF o;
  ELSIF _kind = 'grocery_cart' THEN
    SELECT o.city_id, o.delivery_lat, o.delivery_lng, o.rider_id, o.status,
           COALESCE(_delivery_fee, o.delivery_fee, 0), o.total_amount, o.delivery_address, s.name
      INTO _city, _lat, _lng, _current_rider, _status, _fee, _total, _address, _pickup
      FROM public.grocery_cart_orders o
      LEFT JOIN public.grocery_stores s ON s.id = o.store_id
     WHERE o.id = _order_id
     FOR UPDATE OF o;
  ELSIF _kind = 'grocery_list' THEN
    SELECT s.city_id, o.delivery_lat, o.delivery_lng, o.rider_id, o.status,
           COALESCE(_delivery_fee, o.delivery_fee, 0), o.total_amount, o.delivery_address, s.name
      INTO _city, _lat, _lng, _current_rider, _status, _fee, _total, _address, _pickup
      FROM public.grocery_list_orders o
      JOIN public.grocery_stores s ON s.id = o.store_id
     WHERE o.id = _order_id
     FOR UPDATE OF o;
  ELSE
    RAISE EXCEPTION 'غلط آرڈر قسم';
  END IF;

  IF _status IS NULL THEN RAISE EXCEPTION 'آرڈر موجود نہیں'; END IF;
  IF _current_rider IS NOT NULL THEN RAISE EXCEPTION 'رائیڈر پہلے سے تفویض ہے'; END IF;
  IF _status IN ('delivered', 'completed', 'cancelled') THEN RAISE EXCEPTION 'آرڈر بند ہو چکا ہے'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.riders r
    WHERE r.id = _rider_id AND r.is_available = true
  ) THEN RAISE EXCEPTION 'منتخب رائیڈر آن لائن نہیں'; END IF;

  SELECT COALESCE(offer_timeout_seconds, 40)
    INTO _timeout FROM public.cities WHERE id = _city;

  IF _lat IS NOT NULL THEN
    SELECT public.haversine_km(r.current_lat, r.current_lng, _lat, _lng)
      INTO _distance
      FROM public.riders r
     WHERE r.id = _rider_id AND r.current_lat IS NOT NULL AND r.current_lng IS NOT NULL;
  END IF;

  UPDATE public.delivery_offers
     SET status = 'cancelled', responded_at = COALESCE(responded_at, now())
   WHERE order_id = _order_id AND order_kind = _kind AND status = 'offered';

  INSERT INTO public.delivery_offers (
    order_id, order_kind, rider_id, distance_km, pickup_name,
    dropoff_address, total_amount, delivery_fee, expires_at
  ) VALUES (
    _order_id, _kind, _rider_id, _distance, _pickup,
    _address, _total, COALESCE(_fee, 0), now() + make_interval(secs => GREATEST(_timeout, 20))
  ) RETURNING id INTO _offer_id;

  IF _kind = 'food' THEN
    UPDATE public.orders SET dispatch_state = 'searching' WHERE id = _order_id;
  ELSIF _kind = 'grocery_cart' THEN
    UPDATE public.grocery_cart_orders SET delivery_fee = COALESCE(_fee, 0), dispatch_state = 'searching' WHERE id = _order_id;
  ELSE
    UPDATE public.grocery_list_orders SET delivery_fee = COALESCE(_fee, 0), dispatch_state = 'searching' WHERE id = _order_id;
  END IF;

  RETURN _offer_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_offer_order_to_rider(text, uuid, uuid, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_offer_order_to_rider(text, uuid, uuid, numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.retry_order_dispatch(_kind text, _order_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support')) THEN
    RAISE EXCEPTION 'اجازت نہیں';
  END IF;

  DELETE FROM public.delivery_offers
   WHERE order_kind = _kind AND order_id = _order_id AND status IN ('declined', 'expired', 'cancelled');

  UPDATE public.delivery_offers
     SET status = 'expired', responded_at = now()
   WHERE order_kind = _kind AND order_id = _order_id AND status = 'offered' AND expires_at <= now();

  IF _kind = 'food' THEN
    UPDATE public.orders SET dispatch_state = 'none' WHERE id = _order_id AND rider_id IS NULL;
  ELSIF _kind = 'grocery_cart' THEN
    UPDATE public.grocery_cart_orders SET dispatch_state = 'none' WHERE id = _order_id AND rider_id IS NULL;
  ELSIF _kind = 'grocery_list' THEN
    UPDATE public.grocery_list_orders SET dispatch_state = 'none' WHERE id = _order_id AND rider_id IS NULL;
  ELSE
    RAISE EXCEPTION 'غلط آرڈر قسم';
  END IF;

  RETURN public.dispatch_next_rider(_kind, _order_id);
END;
$$;

REVOKE ALL ON FUNCTION public.retry_order_dispatch(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.retry_order_dispatch(text, uuid) TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'escalate-stale-delivery-offers') THEN
    PERFORM cron.unschedule('escalate-stale-delivery-offers');
  END IF;
  PERFORM cron.schedule(
    'escalate-stale-delivery-offers',
    '* * * * *',
    'SELECT public.escalate_stale_offers();'
  );
END;
$$;