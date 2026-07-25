
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS variants jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS option_groups jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS variant_id text,
  ADD COLUMN IF NOT EXISTS variant_label text,
  ADD COLUMN IF NOT EXISTS options jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS unit_price numeric(10,2);

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
  _order_id UUID;
  _total NUMERIC := 0;
  _delivery_fee NUMERIC;
  _item JSONB;
  _base_price NUMERIC;
  _item_name TEXT;
  _qty INT;
  _delivery_mode TEXT;
  _variants JSONB;
  _option_groups JSONB;
  _sel_variant_id TEXT;
  _sel_option_ids JSONB;
  _variant JSONB;
  _variant_label TEXT;
  _unit_price NUMERIC;
  _opts_snapshot JSONB;
  _group JSONB;
  _choice JSONB;
  _opt_id TEXT;
  _found BOOLEAN;
  _grp_selected INT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT delivery_mode INTO _delivery_mode FROM restaurants WHERE id = _restaurant_id AND is_active = true;
  IF _delivery_mode IS NULL THEN RAISE EXCEPTION 'Invalid or inactive restaurant'; END IF;
  SELECT delivery_fee INTO _delivery_fee FROM cities WHERE id = _city_id;
  IF _delivery_fee IS NULL THEN RAISE EXCEPTION 'Invalid city'; END IF;
  IF _delivery_address IS NULL OR trim(_delivery_address) = '' THEN
    RAISE EXCEPTION 'Delivery address is required';
  END IF;

  IF _delivery_mode = 'self' THEN _delivery_fee := 0; END IF;

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

    SELECT price, name, variants, option_groups
      INTO _base_price, _item_name, _variants, _option_groups
      FROM menu_items
      WHERE id = (_item->>'menu_item_id')::UUID
        AND restaurant_id = _restaurant_id
        AND is_available = true;
    IF _base_price IS NULL THEN RAISE EXCEPTION 'Invalid or unavailable menu item'; END IF;

    _sel_variant_id := _item->>'variant_id';
    _sel_option_ids := COALESCE(_item->'option_ids', '[]'::jsonb);
    _variant_label := NULL;
    _unit_price := _base_price;

    -- Variant selection: if item has variants defined, one must be selected
    IF jsonb_array_length(COALESCE(_variants, '[]'::jsonb)) > 0 THEN
      IF _sel_variant_id IS NULL THEN
        RAISE EXCEPTION 'Variant required for %', _item_name;
      END IF;
      _found := false;
      FOR _variant IN SELECT * FROM jsonb_array_elements(_variants) LOOP
        IF _variant->>'id' = _sel_variant_id THEN
          _unit_price := (_variant->>'price')::NUMERIC;
          _variant_label := _variant->>'label';
          _found := true;
          EXIT;
        END IF;
      END LOOP;
      IF NOT _found THEN RAISE EXCEPTION 'Invalid variant for %', _item_name; END IF;
    END IF;

    -- Option groups validation + price delta
    _opts_snapshot := '[]'::jsonb;
    FOR _group IN SELECT * FROM jsonb_array_elements(COALESCE(_option_groups, '[]'::jsonb)) LOOP
      _grp_selected := 0;
      FOR _choice IN SELECT * FROM jsonb_array_elements(_group->'choices') LOOP
        -- check if this choice id is in _sel_option_ids
        IF EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(_sel_option_ids) AS x(v)
          WHERE x.v = (_choice->>'id')
        ) THEN
          _grp_selected := _grp_selected + 1;
          _unit_price := _unit_price + COALESCE((_choice->>'price_delta')::NUMERIC, 0);
          _opts_snapshot := _opts_snapshot || jsonb_build_object(
            'group', _group->>'name',
            'choice', _choice->>'label',
            'price_delta', COALESCE((_choice->>'price_delta')::NUMERIC, 0),
            'group_id', _group->>'id',
            'choice_id', _choice->>'id'
          );
        END IF;
      END LOOP;
      IF _grp_selected < COALESCE((_group->>'min')::INT, 0) THEN
        RAISE EXCEPTION 'Not enough selections in group % for %', _group->>'name', _item_name;
      END IF;
      IF _grp_selected > COALESCE((_group->>'max')::INT, 999) THEN
        RAISE EXCEPTION 'Too many selections in group % for %', _group->>'name', _item_name;
      END IF;
    END LOOP;

    IF _unit_price < 0 THEN _unit_price := 0; END IF;

    INSERT INTO order_items (order_id, menu_item_id, name, quantity, price, variant_id, variant_label, options, unit_price)
    VALUES (_order_id, (_item->>'menu_item_id')::UUID, _item_name, _qty, _unit_price, _sel_variant_id, _variant_label, _opts_snapshot, _unit_price);

    _total := _total + (_unit_price * _qty);
  END LOOP;

  UPDATE orders SET total_amount = _total + _delivery_fee WHERE id = _order_id;
  RETURN _order_id;
END;
$function$;
