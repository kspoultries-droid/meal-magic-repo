
-- 1. Create server-side order creation function that validates prices from DB
CREATE OR REPLACE FUNCTION public.create_order(
  _restaurant_id UUID,
  _city_id UUID,
  _delivery_address TEXT,
  _notes TEXT,
  _payment_method TEXT,
  _menu_items JSONB -- [{menu_item_id: uuid, quantity: int}]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order_id UUID;
  _total NUMERIC := 0;
  _delivery_fee NUMERIC;
  _item JSONB;
  _price NUMERIC;
  _item_name TEXT;
  _qty INT;
BEGIN
  -- Validate user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate restaurant exists and is active
  IF NOT EXISTS (SELECT 1 FROM restaurants WHERE id = _restaurant_id AND is_active = true) THEN
    RAISE EXCEPTION 'Invalid or inactive restaurant';
  END IF;

  -- Get delivery fee from cities table
  SELECT delivery_fee INTO _delivery_fee FROM cities WHERE id = _city_id;
  IF _delivery_fee IS NULL THEN
    RAISE EXCEPTION 'Invalid city';
  END IF;

  -- Validate address
  IF _delivery_address IS NULL OR trim(_delivery_address) = '' THEN
    RAISE EXCEPTION 'Delivery address is required';
  END IF;

  -- Create the order
  INSERT INTO orders (
    customer_id, restaurant_id, city_id,
    delivery_address, notes, payment_method,
    total_amount, delivery_fee, status
  ) VALUES (
    auth.uid(), _restaurant_id, _city_id,
    _delivery_address, _notes, _payment_method,
    0, _delivery_fee, 'pending'
  ) RETURNING id INTO _order_id;

  -- Insert order items with server-validated prices
  FOR _item IN SELECT * FROM jsonb_array_elements(_menu_items)
  LOOP
    _qty := COALESCE((_item->>'quantity')::INT, 1);
    IF _qty < 1 THEN
      RAISE EXCEPTION 'Invalid quantity';
    END IF;

    SELECT price, name INTO _price, _item_name
    FROM menu_items
    WHERE id = (_item->>'menu_item_id')::UUID
      AND restaurant_id = _restaurant_id
      AND is_available = true;

    IF _price IS NULL THEN
      RAISE EXCEPTION 'Invalid or unavailable menu item';
    END IF;

    INSERT INTO order_items (order_id, menu_item_id, name, quantity, price)
    VALUES (_order_id, (_item->>'menu_item_id')::UUID, _item_name, _qty, _price);

    _total := _total + (_price * _qty);
  END LOOP;

  -- Update order with server-calculated total
  UPDATE orders SET total_amount = _total + _delivery_fee
  WHERE id = _order_id;

  RETURN _order_id;
END;
$$;

-- 2. Lock down has_role to only allow checking own roles (admins can check anyone)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Non-admin users can only check their own roles
  IF auth.uid() != _user_id AND NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$;

-- 3. Lock down owns_restaurant similarly
CREATE OR REPLACE FUNCTION public.owns_restaurant(_user_id uuid, _restaurant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Users can only check their own ownership
  IF auth.uid() != _user_id AND NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE id = _restaurant_id AND owner_id = _user_id
  );
END;
$$;
