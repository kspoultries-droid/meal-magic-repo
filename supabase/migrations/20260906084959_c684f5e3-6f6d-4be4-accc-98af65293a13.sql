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
  _variant_key text;
  _variant jsonb;
  _variant_label text;
  _variant_delta numeric;
  _clean_items jsonb := '[]'::jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _delivery_address IS NULL OR trim(_delivery_address) = '' THEN RAISE EXCEPTION 'Delivery address is required'; END IF;

  SELECT store_type INTO _store_type FROM grocery_stores WHERE id = _store_id AND is_active = true;
  IF _store_type IS NULL THEN RAISE EXCEPTION 'Invalid or inactive store'; END IF;

  FOR _item IN SELECT * FROM jsonb_array_elements(_items)
  LOOP
    _qty := COALESCE((_item->>'quantity')::integer, 1);
    IF _qty < 1 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;

    SELECT id, price, discount_price, wholesale_price, name, weight_kg, variants
      INTO _product
      FROM grocery_products
      WHERE id = COALESCE((_item->>'id')::uuid, (_item->>'product_id')::uuid)
        AND store_id = _store_id
        AND is_available = true;
    IF NOT FOUND THEN RAISE EXCEPTION 'Invalid or unavailable grocery item'; END IF;

    _unit_price := COALESCE(_product.wholesale_price, _product.discount_price, _product.price);

    _variant_key := NULLIF(_item->>'variant_id', '');
    _variant := NULL;
    _variant_label := NULL;
    _variant_delta := 0;

    IF _variant_key IS NOT NULL AND jsonb_typeof(_product.variants) = 'array' THEN
      SELECT v INTO _variant
      FROM jsonb_array_elements(_product.variants) AS v
      WHERE COALESCE(v->>'id', v->>'label', v->>'name') = _variant_key
      LIMIT 1;

      IF _variant IS NULL THEN RAISE EXCEPTION 'Invalid product option selected'; END IF;

      _variant_label := COALESCE(_variant->>'label', _variant->>'name', _variant_key);
      _variant_delta := COALESCE((_variant->>'price_delta')::numeric, 0);
      _unit_price := GREATEST(_unit_price + _variant_delta, 0);
    END IF;

    _subtotal := _subtotal + (_unit_price * _qty);
    _weight := _weight + (GREATEST(COALESCE(_product.weight_kg, 0.5), 0.1) * _qty);

    _clean_items := _clean_items || jsonb_build_object(
      'id', _product.id,
      'name', _product.name,
      'quantity', _qty,
      'unit_price', _unit_price,
      'variant_id', _variant_key,
      'variant_label', _variant_label,
      'variant_price_delta', _variant_delta
    );
  END LOOP;

  SELECT public.quote_delivery(_store_type, _store_id, _city_id, _delivery_lat, _delivery_lng, _weight, _subtotal)
  INTO _quote;

  _delivery_fee := COALESCE((_quote->>'fee')::numeric, 0);

  INSERT INTO grocery_cart_orders (
    store_id, customer_id, items, total_amount, delivery_address, delivery_lat, delivery_lng,
    notes, payment_method, status, is_gift, receiver_name, receiver_phone, city_id,
    delivery_fee, delivery_mode_calc, vehicle_type_id, billable_weight_kg, distance_km, fee_breakdown
  ) VALUES (
    _store_id, auth.uid(), _clean_items, _subtotal + _delivery_fee, _delivery_address, _delivery_lat, _delivery_lng,
    _notes, _payment_method, 'pending', _is_gift, _receiver_name, _receiver_phone, _city_id,
    _delivery_fee, _quote->>'mode', NULLIF(_quote->>'vehicle_type_id','')::uuid,
    COALESCE((_quote->>'weight_kg')::numeric, _weight), COALESCE((_quote->>'distance_km')::numeric, 0), _quote
  ) RETURNING id INTO _order_id;

  RETURN _order_id;
END;
$function$;