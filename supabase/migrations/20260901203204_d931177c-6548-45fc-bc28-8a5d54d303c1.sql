CREATE OR REPLACE FUNCTION public.create_grocery_cart_order(
  _store_id uuid,
  _city_id uuid,
  _delivery_address text,
  _notes text,
  _payment_method text,
  _items jsonb,
  _receiver_name text DEFAULT NULL::text,
  _receiver_phone text DEFAULT NULL::text,
  _is_gift boolean DEFAULT false,
  _delivery_lat double precision DEFAULT NULL::double precision,
  _delivery_lng double precision DEFAULT NULL::double precision
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _order_id uuid;
  _subtotal numeric := 0;
  _delivery_fee numeric := 0;
  _item jsonb;
  _product record;
  _qty integer;
  _unit_price numeric;
  _weight numeric := 0;
  _quote jsonb;
  _store_type text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _delivery_address IS NULL OR trim(_delivery_address) = '' THEN RAISE EXCEPTION 'Delivery address is required'; END IF;

  SELECT store_type INTO _store_type FROM grocery_stores WHERE id = _store_id AND is_active = true;
  IF _store_type IS NULL THEN RAISE EXCEPTION 'Invalid or inactive store'; END IF;

  FOR _item IN SELECT * FROM jsonb_array_elements(_items)
  LOOP
    _qty := COALESCE((_item->>'quantity')::integer, 1);
    IF _qty < 1 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;

    SELECT price, discount_price, name, weight_kg, shipping_class
      INTO _product
      FROM grocery_products
      WHERE id = COALESCE((_item->>'id')::uuid, (_item->>'product_id')::uuid)
        AND store_id = _store_id
        AND is_available = true;
    IF NOT FOUND THEN RAISE EXCEPTION 'Invalid or unavailable grocery item'; END IF;

    _unit_price := COALESCE(_product.discount_price, _product.price);
    _subtotal := _subtotal + (_unit_price * _qty);
    _weight := _weight + (GREATEST(COALESCE(_product.weight_kg, 0.5), 0.1) * _qty);
  END LOOP;

  SELECT to_jsonb(q) INTO _quote
  FROM public.quote_delivery(
    _store_type,
    _store_id,
    _city_id,
    _delivery_lat,
    _delivery_lng,
    _weight,
    _subtotal
  ) q;

  _delivery_fee := COALESCE((_quote->>'fee')::numeric, 0);

  INSERT INTO grocery_cart_orders (
    store_id, customer_id, items, total_amount, delivery_address, delivery_lat, delivery_lng,
    notes, payment_method, status, is_gift, receiver_name, receiver_phone, city_id,
    delivery_fee, delivery_mode_calc, vehicle_type_id, billable_weight_kg, distance_km, fee_breakdown
  ) VALUES (
    _store_id, auth.uid(), _items, _subtotal + _delivery_fee, _delivery_address, _delivery_lat, _delivery_lng,
    _notes, _payment_method, 'pending', _is_gift, _receiver_name, _receiver_phone, _city_id,
    _delivery_fee, _quote->>'mode', NULLIF(_quote->>'vehicle_type_id','')::uuid,
    COALESCE((_quote->>'weight_kg')::numeric, _weight), COALESCE((_quote->>'distance_km')::numeric, 0), _quote
  ) RETURNING id INTO _order_id;

  RETURN _order_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_order(
  _restaurant_id uuid,
  _city_id uuid,
  _delivery_address text,
  _notes text,
  _payment_method text,
  _menu_items jsonb,
  _receiver_name text DEFAULT NULL::text,
  _receiver_phone text DEFAULT NULL::text,
  _is_gift boolean DEFAULT false,
  _delivery_lat double precision DEFAULT NULL::double precision,
  _delivery_lng double precision DEFAULT NULL::double precision
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _order_id uuid;
  _total numeric := 0;
  _delivery_fee numeric := 0;
  _item jsonb;
  _base_price numeric;
  _item_name text;
  _qty integer;
  _unit_price numeric;
  _weight numeric := 0;
  _quote jsonb;
  _delivery_mode text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _delivery_address IS NULL OR trim(_delivery_address) = '' THEN RAISE EXCEPTION 'Delivery address is required'; END IF;

  SELECT delivery_mode INTO _delivery_mode FROM restaurants WHERE id = _restaurant_id AND is_active = true;
  IF _delivery_mode IS NULL THEN RAISE EXCEPTION 'Invalid or inactive restaurant'; END IF;

  FOR _item IN SELECT * FROM jsonb_array_elements(_menu_items)
  LOOP
    _qty := COALESCE((_item->>'quantity')::integer, 1);
    IF _qty < 1 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
    SELECT price, name, weight_kg INTO _base_price, _item_name, _weight
      FROM menu_items
      WHERE id = (_item->>'menu_item_id')::uuid AND restaurant_id = _restaurant_id AND is_available = true;
    IF _base_price IS NULL THEN RAISE EXCEPTION 'Invalid or unavailable menu item'; END IF;
    _unit_price := _base_price;
    _total := _total + (_unit_price * _qty);
    _weight := _weight + (GREATEST(COALESCE(_weight, 0.5), 0.1) * _qty);
  END LOOP;

  IF _delivery_mode <> 'self' THEN
    SELECT to_jsonb(q) INTO _quote
    FROM public.quote_delivery('food', _restaurant_id, _city_id, _delivery_lat, _delivery_lng, _weight, _total) q;
    _delivery_fee := COALESCE((_quote->>'fee')::numeric, 0);
  ELSE
    _quote := jsonb_build_object('mode', 'rider', 'fee', 0, 'weight_kg', _weight, 'distance_km', 0, 'needs_quote', false);
  END IF;

  INSERT INTO orders (
    customer_id, restaurant_id, city_id, delivery_address, notes, payment_method,
    total_amount, delivery_fee, status, receiver_name, receiver_phone, is_gift,
    delivery_lat, delivery_lng, delivery_mode_calc, vehicle_type_id, billable_weight_kg,
    distance_km, fee_breakdown
  ) VALUES (
    auth.uid(), _restaurant_id, _city_id, _delivery_address, _notes, _payment_method,
    _total + _delivery_fee, _delivery_fee, 'pending', _receiver_name, _receiver_phone, _is_gift,
    _delivery_lat, _delivery_lng, _quote->>'mode', NULLIF(_quote->>'vehicle_type_id','')::uuid,
    COALESCE((_quote->>'weight_kg')::numeric, _weight), COALESCE((_quote->>'distance_km')::numeric, 0), _quote
  ) RETURNING id INTO _order_id;

  RETURN _order_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.quote_delivery(text, uuid, uuid, double precision, double precision, numeric, numeric) FROM anon;
GRANT EXECUTE ON FUNCTION public.quote_delivery(text, uuid, uuid, double precision, double precision, numeric, numeric) TO authenticated, service_role;