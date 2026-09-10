ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS vehicle_type_id uuid REFERENCES public.vehicle_types(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_vehicle_type_id ON public.orders(vehicle_type_id);

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
  _line_type text;
  _choice_id text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  PERFORM set_config('app.bypass_order_guard', 'on', true);

  SELECT delivery_mode INTO _delivery_mode
  FROM restaurants
  WHERE id = _restaurant_id AND is_active = true;
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

    _line_type := COALESCE(_item->>'line_type', 'main');
    _sel_variant_id := _item->>'variant_id';
    _sel_option_ids := COALESCE(_item->'option_ids', '[]'::jsonb);
    _variant_label := NULL;
    _unit_price := _base_price;
    _opts_snapshot := '[]'::jsonb;

    IF _line_type = 'addon' THEN
      _choice_id := _item->>'choice_id';
      _found := false;
      FOR _group IN SELECT * FROM jsonb_array_elements(COALESCE(_option_groups, '[]'::jsonb)) LOOP
        FOR _choice IN SELECT * FROM jsonb_array_elements(COALESCE(_group->'choices', '[]'::jsonb)) LOOP
          IF _choice->>'id' = _choice_id THEN
            _item_name := _choice->>'label';
            _unit_price := GREATEST(COALESCE((_choice->>'price_delta')::numeric, 0), 0);
            _opts_snapshot := jsonb_build_array(jsonb_build_object(
              'group', _group->>'name',
              'choice', _choice->>'label',
              'price_delta', _unit_price,
              'group_id', _group->>'id',
              'choice_id', _choice->>'id',
              'quantity', _qty
            ));
            _found := true;
            EXIT;
          END IF;
        END LOOP;
        EXIT WHEN _found;
      END LOOP;
      IF NOT _found THEN RAISE EXCEPTION 'Invalid add-on for %', _item_name; END IF;
      _sel_variant_id := NULL;
      _item_weight := 0.1;
    ELSE
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

      FOR _group IN SELECT * FROM jsonb_array_elements(COALESCE(_option_groups, '[]'::jsonb)) LOOP
        _grp_selected := 0;
        FOR _choice IN SELECT * FROM jsonb_array_elements(COALESCE(_group->'choices', '[]'::jsonb)) LOOP
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
    END IF;

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