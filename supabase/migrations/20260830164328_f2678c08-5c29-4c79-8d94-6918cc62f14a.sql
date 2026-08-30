CREATE OR REPLACE FUNCTION public.get_order_customer_contact(_kind text, _order_id uuid)
RETURNS TABLE(customer_name text, customer_phone text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cust uuid;
  _rider uuid;
  _rname text;
  _rphone text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;

  IF _kind = 'food' THEN
    SELECT o.customer_id, o.rider_id, o.receiver_name, o.receiver_phone
      INTO _cust, _rider, _rname, _rphone FROM public.orders o WHERE o.id = _order_id;
  ELSIF _kind = 'grocery_cart' THEN
    SELECT o.customer_id, o.rider_id, o.receiver_name, o.receiver_phone
      INTO _cust, _rider, _rname, _rphone FROM public.grocery_cart_orders o WHERE o.id = _order_id;
  ELSIF _kind = 'grocery_list' THEN
    SELECT o.customer_id, o.rider_id, o.receiver_name, o.receiver_phone
      INTO _cust, _rider, _rname, _rphone FROM public.grocery_list_orders o WHERE o.id = _order_id;
  ELSE
    RETURN;
  END IF;

  IF _cust IS NULL THEN RETURN; END IF;
  IF NOT (_rider = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
          OR public.has_role(auth.uid(), 'support')) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT COALESCE(NULLIF(_rname, ''), p.full_name), COALESCE(NULLIF(_rphone, ''), p.phone)
  FROM public.profiles p WHERE p.id = _cust;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_order_customer_contact(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_order_customer_contact(text, uuid) TO authenticated;