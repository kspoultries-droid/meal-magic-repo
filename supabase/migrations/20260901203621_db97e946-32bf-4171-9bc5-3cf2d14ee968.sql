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
  _delivery_mode text;
  _variants jsonb;
  _option_groups jsonb;
  _sel_variant_id text;
  _sel_option_ids jsonb;
  _variant jsonb;
  _variant_label text;
  _unit_price numeric;
  _opts_snapshot jsonb;
  _group jsonb;
  _choice jsonb;
  _found boolean;
  _grp_selected integer;
  _item_weight numeric;
  _weight numeric := 0;
  _quote jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  PERFORM set_config('app.bypass_order_guard', 'on', true);

  SELECT delivery_mode INTO _delivery_mode FROM restaurants WHERE id = _restaurant_id AND is_active = true;
  IF _delivery_mode IS NULL THEN RAISE EXCEPTION 'Invalid or inactive restaurant'; END IF;
  IF _delivery_address IS NULL OR trim(_delivery_address) = '' THEN
    RAISE EXCEPTION 'Delivery address is required';
  END IF;

  INSERT INTO orders (
    customer_id, restaurant_id, city_id, delivery_address, notes, payment_method,
    total_amount, delivery_fee, status, receiver_name, receiver_phone, is_gift,
    delivery_lat, delivery_lng
  ) VALUES (
    auth.uid(), _restaurant_id, _city_id, _delivery_address, _notes, _payment_method,
    0, 0, 'pending', _receiver_name, _receiver_phone, _is_gift,
    _delivery_lat, _delivery_lng
  ) RETURNING id INTO _order_id;

  FOR _item IN SELECT * FROM jsonb_array_elements(_menu_items)
  LOOP
    _qty := COALESCE((_item->>'quantity')::integer, 1);
    IF _qty < 1 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;

    SELECT price, name, variants, option_groups, weight_kg
      INTO _base_price, _item_name, _variants, _option_groups, _item_weight
      FROM menu_items
      WHERE id = (_item->>'menu_item_id')::uuid
        AND restaurant_id = _restaurant_id
        AND is_available = true;
    IF _base_price IS NULL THEN RAISE EXCEPTION 'Invalid or unavailable menu item'; END IF;

    _sel_variant_id := _item->>'variant_id';
    _sel_option_ids := COALESCE(_item->'option_ids', '[]'::jsonb);
    _variant_label := NULL;
    _unit_price := _base_price;

    IF jsonb_array_length(COALESCE(_variants, '[]'::jsonb)) > 0 AND _sel_variant_id IS NOT NULL THEN
      _found := false;
      FOR _variant IN SELECT * FROM jsonb_array_elements(_variants) LOOP
        IF _variant->>'id' = _sel_variant_id THEN
          _unit_price := (_variant->>'price')::numeric;
          _variant_label := _variant->>'label';
          _found := true;
          EXIT;
        END IF;
      END LOOP;
      IF NOT _found THEN RAISE EXCEPTION 'Invalid variant for %', _item_name; END IF;
    END IF;

    _opts_snapshot := '[]'::jsonb;
    FOR _group IN SELECT * FROM jsonb_array_elements(COALESCE(_option_groups, '[]'::jsonb)) LOOP
      _grp_selected := 0;
      FOR _choice IN SELECT * FROM jsonb_array_elements(_group->'choices') LOOP
        IF EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(_sel_option_ids) AS x(v)
          WHERE x.v = (_choice->>'id')
        ) THEN
          _grp_selected := _grp_selected + 1;
          _unit_price := _unit_price + COALESCE((_choice->>'price_delta')::numeric, 0);
          _opts_snapshot := _opts_snapshot || jsonb_build_object(
            'group', _group->>'name',
            'choice', _choice->>'label',
            'price_delta', COALESCE((_choice->>'price_delta')::numeric, 0),
            'group_id', _group->>'id',
            'choice_id', _choice->>'id'
          );
        END IF;
      END LOOP;
      IF _grp_selected > COALESCE((_group->>'max')::integer, 999) THEN
        RAISE EXCEPTION 'Too many selections in group % for %', _group->>'name', _item_name;
      END IF;
    END LOOP;

    IF _unit_price < 0 THEN _unit_price := 0; END IF;

    INSERT INTO order_items (order_id, menu_item_id, name, quantity, price, variant_id, variant_label, options, unit_price)
    VALUES (_order_id, (_item->>'menu_item_id')::uuid, _item_name, _qty, _unit_price, _sel_variant_id, _variant_label, _opts_snapshot, _unit_price);

    _total := _total + (_unit_price * _qty);
    _weight := _weight + (GREATEST(COALESCE(_item_weight, 0.5), 0.1) * _qty);
  END LOOP;

  IF _delivery_mode <> 'self' THEN
    SELECT public.quote_delivery('food', _restaurant_id, _city_id, _delivery_lat, _delivery_lng, _weight, _total)
    INTO _quote;
    _delivery_fee := COALESCE((_quote->>'fee')::numeric, 0);
  ELSE
    _quote := jsonb_build_object('mode', 'rider', 'fee', 0, 'weight_kg', _weight, 'distance_km', 0, 'needs_quote', false);
  END IF;

  UPDATE orders SET
    total_amount = _total + _delivery_fee,
    delivery_fee = _delivery_fee,
    delivery_mode_calc = _quote->>'mode',
    vehicle_type_id = NULLIF(_quote->>'vehicle_type_id','')::uuid,
    billable_weight_kg = COALESCE((_quote->>'weight_kg')::numeric, _weight),
    distance_km = COALESCE((_quote->>'distance_km')::numeric, 0),
    fee_breakdown = _quote
  WHERE id = _order_id;

  RETURN _order_id;
END;
$function$;

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

    SELECT price, discount_price, wholesale_price, name, weight_kg
      INTO _product
      FROM grocery_products
      WHERE id = COALESCE((_item->>'id')::uuid, (_item->>'product_id')::uuid)
        AND store_id = _store_id
        AND is_available = true;
    IF NOT FOUND THEN RAISE EXCEPTION 'Invalid or unavailable grocery item'; END IF;

    _unit_price := COALESCE(_product.wholesale_price, _product.discount_price, _product.price);
    _subtotal := _subtotal + (_unit_price * _qty);
    _weight := _weight + (GREATEST(COALESCE(_product.weight_kg, 0.5), 0.1) * _qty);
  END LOOP;

  SELECT public.quote_delivery(_store_type, _store_id, _city_id, _delivery_lat, _delivery_lng, _weight, _subtotal)
  INTO _quote;

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