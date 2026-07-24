
-- 1. app_owner: admins only
DROP POLICY IF EXISTS "Anyone can read app_owner" ON public.app_owner;
CREATE POLICY "Admins can read app_owner" ON public.app_owner
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. service_providers: require authentication to view (hides phone from anonymous scrapers)
DROP POLICY IF EXISTS "Anyone view active providers" ON public.service_providers;
CREATE POLICY "Authenticated users view active providers"
  ON public.service_providers
  FOR SELECT TO authenticated
  USING (is_active = true);
REVOKE SELECT ON public.service_providers FROM anon;

-- 3. product-images: drop permissive upload policy
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;

-- 4. Storage listing: remove broad SELECT on public buckets.
-- Public URLs still work because the bucket is marked public; RLS only affects listing/API access.
DROP POLICY IF EXISTS "Public read access for product images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Public read access" ON storage.objects;

-- 5. Revoke execute on SECURITY DEFINER functions that are triggers or internal-only
REVOKE EXECUTE ON FUNCTION public.create_wallet_for_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.protect_primary_admin() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.protect_owner_profile() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;

-- Revoke anon execute on user-facing RPCs (authenticated stays)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.manages_category(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.owns_restaurant(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.request_wallet_topup(numeric, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_order(uuid, uuid, text, text, text, jsonb) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_order(uuid, uuid, text, text, text, jsonb, text, text, boolean, double precision, double precision) FROM anon, PUBLIC;

-- 6. Server-side RPC: create grocery cart order with server-computed totals
CREATE OR REPLACE FUNCTION public.create_grocery_cart_order(
  _store_id uuid,
  _city_id uuid,
  _delivery_address text,
  _notes text,
  _payment_method text,
  _items jsonb,
  _receiver_name text DEFAULT NULL,
  _receiver_phone text DEFAULT NULL,
  _is_gift boolean DEFAULT false,
  _delivery_lat double precision DEFAULT NULL,
  _delivery_lng double precision DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order_id uuid;
  _total numeric := 0;
  _delivery_fee numeric := 0;
  _item jsonb;
  _price numeric;
  _name text;
  _image text;
  _qty int;
  _resolved_items jsonb := '[]'::jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.grocery_stores WHERE id = _store_id) THEN
    RAISE EXCEPTION 'Invalid store';
  END IF;
  IF _delivery_address IS NULL OR trim(_delivery_address) = '' THEN
    RAISE EXCEPTION 'Delivery address is required';
  END IF;

  SELECT COALESCE(delivery_fee, 0) INTO _delivery_fee FROM public.cities WHERE id = _city_id;
  IF _delivery_fee IS NULL THEN _delivery_fee := 0; END IF;

  FOR _item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    _qty := COALESCE((_item->>'quantity')::int, 1);
    IF _qty < 1 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
    SELECT COALESCE(discount_price, price), name, image_url
      INTO _price, _name, _image
      FROM public.grocery_products
      WHERE id = (_item->>'id')::uuid
        AND store_id = _store_id
        AND is_available = true;
    IF _price IS NULL THEN RAISE EXCEPTION 'Invalid or unavailable product'; END IF;
    _total := _total + (_price * _qty);
    _resolved_items := _resolved_items || jsonb_build_object(
      'id', (_item->>'id')::uuid,
      'name', _name,
      'price', _price,
      'quantity', _qty,
      'image', _image
    );
  END LOOP;

  INSERT INTO public.grocery_cart_orders (
    store_id, customer_id, items, total_amount, delivery_address,
    delivery_lat, delivery_lng, notes, payment_method,
    is_gift, receiver_name, receiver_phone, city_id
  ) VALUES (
    _store_id, auth.uid(), _resolved_items, _total + _delivery_fee, _delivery_address,
    _delivery_lat, _delivery_lng, _notes, COALESCE(_payment_method, 'cod'),
    _is_gift, CASE WHEN _is_gift THEN _receiver_name END,
    CASE WHEN _is_gift THEN _receiver_phone END, _city_id
  ) RETURNING id INTO _order_id;

  RETURN _order_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.create_grocery_cart_order(uuid, uuid, text, text, text, jsonb, text, text, boolean, double precision, double precision) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_grocery_cart_order(uuid, uuid, text, text, text, jsonb, text, text, boolean, double precision, double precision) TO authenticated;

-- 7. Server-side RPC: create service booking with server-computed totals
CREATE OR REPLACE FUNCTION public.create_service_booking(
  _service_id uuid,
  _address text,
  _scheduled_date date,
  _scheduled_time time,
  _notes text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _booking_id uuid;
  _price numeric;
  _advance numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _address IS NULL OR trim(_address) = '' THEN RAISE EXCEPTION 'Address required'; END IF;

  SELECT price INTO _price FROM public.services WHERE id = _service_id AND is_active = true;
  IF _price IS NULL THEN RAISE EXCEPTION 'Invalid or inactive service'; END IF;

  _advance := round(_price * 0.15);

  INSERT INTO public.service_bookings (
    service_id, customer_id, address, scheduled_date, scheduled_time,
    notes, total_amount, advance_fee
  ) VALUES (
    _service_id, auth.uid(), _address, _scheduled_date, _scheduled_time,
    _notes, _price, _advance
  ) RETURNING id INTO _booking_id;

  RETURN _booking_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.create_service_booking(uuid, text, date, time, text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_service_booking(uuid, text, date, time, text) TO authenticated;
