CREATE OR REPLACE FUNCTION public.create_order(_restaurant_id uuid, _city_id uuid, _delivery_address text, _notes text, _payment_method text, _menu_items jsonb, _receiver_name text DEFAULT NULL::text, _receiver_phone text DEFAULT NULL::text, _is_gift boolean DEFAULT false, _delivery_lat double precision DEFAULT NULL::double precision, _delivery_lng double precision DEFAULT NULL::double precision)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _order_id UUID;
  _total NUMERIC := 0;
  _delivery_fee NUMERIC;
  _item JSONB;
  _price NUMERIC;
  _item_name TEXT;
  _qty INT;
  _delivery_mode TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT delivery_mode INTO _delivery_mode FROM restaurants WHERE id = _restaurant_id AND is_active = true;
  IF _delivery_mode IS NULL THEN RAISE EXCEPTION 'Invalid or inactive restaurant'; END IF;
  SELECT delivery_fee INTO _delivery_fee FROM cities WHERE id = _city_id;
  IF _delivery_fee IS NULL THEN RAISE EXCEPTION 'Invalid city'; END IF;
  IF _delivery_address IS NULL OR trim(_delivery_address) = '' THEN
    RAISE EXCEPTION 'Delivery address is required';
  END IF;

  -- Self-delivery restaurants: no platform delivery fee
  IF _delivery_mode = 'self' THEN
    _delivery_fee := 0;
  END IF;

  INSERT INTO orders (
    customer_id, restaurant_id, city_id, delivery_address, notes, payment_method,
    total_amount, delivery_fee, status, receiver_name, receiver_phone, is_gift,
    delivery_lat, delivery_lng
  ) VALUES (
    auth.uid(), _restaurant_id, _city_id, _delivery_address, _notes, _payment_method,
    0, _delivery_fee, 'pending', _receiver_name, _receiver_phone, _is_gift,
    _delivery_lat, _delivery_lng
  ) RETURNING id INTO _order_id;

  FOR _item IN SELECT * FROM jsonb_array_elements(_menu_items)
  LOOP
    _qty := COALESCE((_item->>'quantity')::INT, 1);
    IF _qty < 1 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
    SELECT price, name INTO _price, _item_name FROM menu_items
    WHERE id = (_item->>'menu_item_id')::UUID AND restaurant_id = _restaurant_id AND is_available = true;
    IF _price IS NULL THEN RAISE EXCEPTION 'Invalid or unavailable menu item'; END IF;
    INSERT INTO order_items (order_id, menu_item_id, name, quantity, price)
    VALUES (_order_id, (_item->>'menu_item_id')::UUID, _item_name, _qty, _price);
    _total := _total + (_price * _qty);
  END LOOP;

  UPDATE orders SET total_amount = _total + _delivery_fee WHERE id = _order_id;
  RETURN _order_id;
END;
$function$;