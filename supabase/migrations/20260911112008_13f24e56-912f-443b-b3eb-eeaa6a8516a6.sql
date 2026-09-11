CREATE OR REPLACE FUNCTION public.admin_force_assign_rider(_kind text, _order_id uuid, _rider_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _status text;
  _current_rider uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support')) THEN
    RAISE EXCEPTION 'اجازت نہیں';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = _rider_id AND ur.role = 'rider') THEN
    RAISE EXCEPTION 'یہ اکاؤنٹ رائیڈر نہیں';
  END IF;
  IF EXISTS (SELECT 1 FROM public.riders r WHERE r.id = _rider_id AND r.is_suspended = true) THEN
    RAISE EXCEPTION 'یہ رائیڈر معطل ہے';
  END IF;

  PERFORM set_config('app.bypass_order_guard', 'on', true);

  IF _kind = 'food' THEN
    SELECT status, rider_id INTO _status, _current_rider FROM public.orders WHERE id = _order_id FOR UPDATE;
  ELSIF _kind = 'grocery_cart' THEN
    SELECT status, rider_id INTO _status, _current_rider FROM public.grocery_cart_orders WHERE id = _order_id FOR UPDATE;
  ELSIF _kind = 'grocery_list' THEN
    SELECT status, rider_id INTO _status, _current_rider FROM public.grocery_list_orders WHERE id = _order_id FOR UPDATE;
  ELSE
    RAISE EXCEPTION 'غلط آرڈر قسم';
  END IF;

  IF _status IS NULL THEN RAISE EXCEPTION 'آرڈر موجود نہیں'; END IF;
  IF _status IN ('delivered','completed','cancelled') THEN RAISE EXCEPTION 'آرڈر بند ہو چکا ہے'; END IF;

  UPDATE public.delivery_offers
     SET status = 'cancelled', responded_at = COALESCE(responded_at, now())
   WHERE order_id = _order_id AND order_kind = _kind AND status = 'offered';

  IF _kind = 'food' THEN
    UPDATE public.orders SET rider_id = _rider_id, dispatch_state = 'assigned' WHERE id = _order_id;
  ELSIF _kind = 'grocery_cart' THEN
    UPDATE public.grocery_cart_orders SET rider_id = _rider_id, rider_assigned_at = now(), dispatch_state = 'assigned' WHERE id = _order_id;
  ELSE
    UPDATE public.grocery_list_orders SET rider_id = _rider_id, rider_assigned_at = now(), dispatch_state = 'assigned' WHERE id = _order_id;
  END IF;

  INSERT INTO public.delivery_offers (
    order_id, order_kind, rider_id, status, expires_at, responded_at
  ) VALUES (
    _order_id, _kind, _rider_id, 'accepted', now(), now()
  );

  PERFORM set_config('app.bypass_order_guard', 'off', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_force_assign_rider(text, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_force_assign_rider(text, uuid, uuid) TO authenticated;