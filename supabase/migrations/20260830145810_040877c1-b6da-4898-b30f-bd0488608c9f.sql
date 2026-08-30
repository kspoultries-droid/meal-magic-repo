-- Allow trusted SECURITY DEFINER order functions to write financial columns,
-- while still blocking direct client updates.

CREATE OR REPLACE FUNCTION public.protect_food_order_financials()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('app.bypass_order_guard', true) = 'on'
     OR auth.uid() IS NULL
     OR public.has_role(auth.uid(), 'admin')
     OR public.has_role(auth.uid(), 'support') THEN
    RETURN NEW;
  END IF;

  NEW.customer_id     := OLD.customer_id;
  NEW.total_amount    := OLD.total_amount;
  NEW.discount_amount := OLD.discount_amount;
  NEW.delivery_fee    := OLD.delivery_fee;
  NEW.voucher_code    := OLD.voucher_code;
  NEW.payment_status  := OLD.payment_status;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.protect_order_financials()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('app.bypass_order_guard', true) = 'on'
     OR auth.uid() IS NULL
     OR public.has_role(auth.uid(), 'admin')
     OR public.has_role(auth.uid(), 'support') THEN
    RETURN NEW;
  END IF;

  NEW.customer_id     := OLD.customer_id;
  NEW.total_amount    := OLD.total_amount;
  NEW.discount_amount := OLD.discount_amount;
  NEW.delivery_fee    := OLD.delivery_fee;
  NEW.voucher_code    := OLD.voucher_code;
  RETURN NEW;
END;
$function$;

-- create_order: set bypass flag before the total UPDATE
CREATE OR REPLACE FUNCTION public.create_order(_restaurant_id uuid, _city_id uuid, _delivery_address text, _notes text, _payment_method text, _menu_items jsonb, _receiver_name text DEFAULT NULL::text, _receiver_phone text DEFAULT NULL::text, _is_gift boolean DEFAULT false, _delivery_lat double precision DEFAULT NULL::double precision, _delivery_lng double precision DEFAULT NULL::double precision)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
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
  _found BOOLEAN;
  _grp_selected INT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  PERFORM set_config('app.bypass_order_guard', 'on', true);

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

    IF jsonb_array_length(COALESCE(_variants, '[]'::jsonb)) > 0 AND _sel_variant_id IS NOT NULL THEN
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

    _opts_snapshot := '[]'::jsonb;
    FOR _group IN SELECT * FROM jsonb_array_elements(COALESCE(_option_groups, '[]'::jsonb)) LOOP
      _grp_selected := 0;
      FOR _choice IN SELECT * FROM jsonb_array_elements(_group->'choices') LOOP
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

CREATE OR REPLACE FUNCTION public.apply_voucher_to_order(_kind text, _order_id uuid, _code text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v record;
  sub numeric;
  disc numeric;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'لاگ اِن درکار ہے'); END IF;
  PERFORM set_config('app.bypass_order_guard', 'on', true);

  SELECT * INTO v FROM vouchers WHERE upper(code) = upper(trim(_code)) AND is_active = true;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'غلط یا غیر فعال کوڈ'); END IF;
  IF v.valid_from > now() OR (v.valid_until IS NOT NULL AND v.valid_until < now()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'واؤچر کی میعاد ختم');
  END IF;
  IF v.usage_limit IS NOT NULL AND v.used_count >= v.usage_limit THEN
    RETURN jsonb_build_object('ok', false, 'error', 'استعمال کی حد پوری ہو چکی');
  END IF;

  IF _kind = 'grocery' THEN
    SELECT total_amount INTO sub FROM grocery_cart_orders
    WHERE id = _order_id AND customer_id = auth.uid() AND status = 'pending' AND voucher_code IS NULL;
    IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'آرڈر نہیں ملا یا واؤچر پہلے سے لاگو ہے'); END IF;
    IF v.scope NOT IN ('all','grocery','wholesale') THEN RETURN jsonb_build_object('ok', false, 'error', 'یہ کوڈ یہاں لاگو نہیں'); END IF;
    IF sub < v.min_order THEN RETURN jsonb_build_object('ok', false, 'error', 'کم از کم آرڈر پورا نہیں'); END IF;
    disc := CASE WHEN v.discount_type = 'percent' THEN round(sub * v.discount_value / 100) ELSE v.discount_value END;
    IF v.max_discount IS NOT NULL THEN disc := least(disc, v.max_discount); END IF;
    disc := least(disc, sub);
    UPDATE grocery_cart_orders
      SET voucher_code = v.code, discount_amount = disc,
          total_amount = greatest(0, total_amount - disc)
      WHERE id = _order_id;
  ELSIF _kind = 'food' THEN
    SELECT total_amount INTO sub FROM orders
    WHERE id = _order_id AND customer_id = auth.uid() AND status = 'pending' AND voucher_code IS NULL;
    IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'آرڈر نہیں ملا یا واؤچر پہلے سے لاگو ہے'); END IF;
    IF v.scope NOT IN ('all','food') THEN RETURN jsonb_build_object('ok', false, 'error', 'یہ کوڈ یہاں لاگو نہیں'); END IF;
    IF sub < v.min_order THEN RETURN jsonb_build_object('ok', false, 'error', 'کم از کم آرڈر پورا نہیں'); END IF;
    disc := CASE WHEN v.discount_type = 'percent' THEN round(sub * v.discount_value / 100) ELSE v.discount_value END;
    IF v.max_discount IS NOT NULL THEN disc := least(disc, v.max_discount); END IF;
    disc := least(disc, sub);
    UPDATE orders
      SET voucher_code = v.code, discount_amount = disc,
          total_amount = greatest(0, total_amount - disc)
      WHERE id = _order_id;
  ELSE
    RETURN jsonb_build_object('ok', false, 'error', 'غلط آرڈر قسم');
  END IF;

  UPDATE vouchers SET used_count = used_count + 1 WHERE id = v.id;

  BEGIN
    INSERT INTO order_events (order_id, event_type, note)
    VALUES (_order_id, 'voucher_applied', 'Voucher ' || v.code || ' applied — discount Rs ' || disc);
  EXCEPTION WHEN others THEN NULL;
  END;

  RETURN jsonb_build_object('ok', true, 'code', v.code, 'discount', disc);
END $function$;

REVOKE EXECUTE ON FUNCTION public.protect_food_order_financials() FROM anon;
REVOKE EXECUTE ON FUNCTION public.protect_order_financials() FROM anon;
REVOKE EXECUTE ON FUNCTION public.apply_voucher_to_order(text, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_order(uuid, uuid, text, text, text, jsonb, text, text, boolean, double precision, double precision) FROM anon;