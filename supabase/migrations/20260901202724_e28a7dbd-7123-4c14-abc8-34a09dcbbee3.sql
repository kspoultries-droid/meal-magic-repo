-- 1. Vehicle types
CREATE TABLE public.vehicle_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  name_ur text,
  capacity_kg numeric NOT NULL DEFAULT 20,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vehicle_types TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_types TO authenticated;
GRANT ALL ON public.vehicle_types TO service_role;
ALTER TABLE public.vehicle_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vehicle_types_read" ON public.vehicle_types FOR SELECT USING (true);
CREATE POLICY "vehicle_types_admin" ON public.vehicle_types FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_vehicle_types_updated BEFORE UPDATE ON public.vehicle_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Rate cards
CREATE TABLE public.delivery_rate_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid REFERENCES public.cities(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('rider','loader','intercity','courier')),
  vehicle_type_id uuid REFERENCES public.vehicle_types(id) ON DELETE SET NULL,
  label text,
  base_fee numeric NOT NULL DEFAULT 0,
  per_km numeric NOT NULL DEFAULT 0,
  free_km numeric NOT NULL DEFAULT 0,
  min_fee numeric NOT NULL DEFAULT 0,
  max_fee numeric,
  free_above_amount numeric,
  max_weight_kg numeric,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.delivery_rate_cards TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_rate_cards TO authenticated;
GRANT ALL ON public.delivery_rate_cards TO service_role;
ALTER TABLE public.delivery_rate_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rate_cards_read" ON public.delivery_rate_cards FOR SELECT USING (true);
CREATE POLICY "rate_cards_admin" ON public.delivery_rate_cards FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_rate_cards_updated BEFORE UPDATE ON public.delivery_rate_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Weight slabs
CREATE TABLE public.delivery_weight_slabs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_card_id uuid NOT NULL REFERENCES public.delivery_rate_cards(id) ON DELETE CASCADE,
  min_kg numeric NOT NULL DEFAULT 0,
  max_kg numeric,
  extra_fee numeric NOT NULL DEFAULT 0,
  per_kg_fee numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.delivery_weight_slabs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_weight_slabs TO authenticated;
GRANT ALL ON public.delivery_weight_slabs TO service_role;
ALTER TABLE public.delivery_weight_slabs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "weight_slabs_read" ON public.delivery_weight_slabs FOR SELECT USING (true);
CREATE POLICY "weight_slabs_admin" ON public.delivery_weight_slabs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Intercity routes
CREATE TABLE public.intercity_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_city_id uuid NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  to_name text NOT NULL,
  to_city_id uuid REFERENCES public.cities(id) ON DELETE SET NULL,
  distance_km numeric NOT NULL DEFAULT 0,
  vehicle_type_id uuid REFERENCES public.vehicle_types(id) ON DELETE SET NULL,
  flat_fee numeric NOT NULL DEFAULT 0,
  per_kg_fee numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.intercity_routes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intercity_routes TO authenticated;
GRANT ALL ON public.intercity_routes TO service_role;
ALTER TABLE public.intercity_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "intercity_read" ON public.intercity_routes FOR SELECT USING (true);
CREATE POLICY "intercity_admin" ON public.intercity_routes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_intercity_updated BEFORE UPDATE ON public.intercity_routes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Bulk delivery quotes
CREATE TABLE public.delivery_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_kind text NOT NULL DEFAULT 'grocery',
  order_id uuid,
  store_id uuid,
  customer_id uuid NOT NULL,
  mode text NOT NULL DEFAULT 'loader',
  vehicle_type_id uuid REFERENCES public.vehicle_types(id) ON DELETE SET NULL,
  weight_kg numeric NOT NULL DEFAULT 0,
  distance_km numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  note text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','offered','accepted','rejected','cancelled')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.delivery_quotes TO authenticated;
GRANT ALL ON public.delivery_quotes TO service_role;
ALTER TABLE public.delivery_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quotes_customer_read" ON public.delivery_quotes FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.grocery_stores gs WHERE gs.id = delivery_quotes.store_id AND gs.owner_id = auth.uid()));
CREATE POLICY "quotes_insert" ON public.delivery_quotes FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.grocery_stores gs WHERE gs.id = delivery_quotes.store_id AND gs.owner_id = auth.uid()));
CREATE POLICY "quotes_update" ON public.delivery_quotes FOR UPDATE TO authenticated
  USING (customer_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.grocery_stores gs WHERE gs.id = delivery_quotes.store_id AND gs.owner_id = auth.uid()));
CREATE TRIGGER trg_quotes_updated BEFORE UPDATE ON public.delivery_quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Product weight + rider vehicle
ALTER TABLE public.grocery_products
  ADD COLUMN IF NOT EXISTS weight_kg numeric NOT NULL DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS shipping_class text NOT NULL DEFAULT 'normal';
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS weight_kg numeric NOT NULL DEFAULT 0.5;
ALTER TABLE public.riders
  ADD COLUMN IF NOT EXISTS vehicle_type_id uuid REFERENCES public.vehicle_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS capacity_kg numeric NOT NULL DEFAULT 20;

-- 7. Order shipping details
ALTER TABLE public.grocery_cart_orders
  ADD COLUMN IF NOT EXISTS delivery_mode_calc text,
  ADD COLUMN IF NOT EXISTS vehicle_type_id uuid REFERENCES public.vehicle_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS billable_weight_kg numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS distance_km numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_mode_calc text,
  ADD COLUMN IF NOT EXISTS billable_weight_kg numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS distance_km numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 8. Seed vehicle types
INSERT INTO public.vehicle_types (code, name, name_ur, capacity_kg, sort_order) VALUES
  ('bike', 'Bike', 'بائیک', 15, 1),
  ('rickshaw', 'Loader Rickshaw', 'لوڈر رکشہ', 300, 2),
  ('pickup', 'Suzuki Pickup', 'سوزوکی پک اپ', 800, 3),
  ('mazda', 'Mazda', 'مزدا', 4000, 4),
  ('truck', 'Truck', 'ٹرک', 12000, 5)
ON CONFLICT (code) DO NOTHING;

-- 9. Quote engine
CREATE OR REPLACE FUNCTION public.quote_delivery(
  _store_kind text,
  _store_id uuid,
  _city_id uuid,
  _lat double precision,
  _lng double precision,
  _weight_kg numeric,
  _subtotal numeric
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lat double precision;
  v_lng double precision;
  v_store_city uuid;
  v_nationwide boolean := false;
  v_km numeric := 0;
  v_mode text;
  v_card public.delivery_rate_cards%ROWTYPE;
  v_slab_fee numeric := 0;
  v_vehicle_id uuid;
  v_vehicle_code text;
  v_vehicle_name text;
  v_fee numeric := 0;
  v_distance_fee numeric := 0;
  v_weight numeric := GREATEST(COALESCE(_weight_kg, 0), 0);
  v_needs_quote boolean := false;
BEGIN
  IF _store_kind = 'food' THEN
    SELECT pickup_lat, pickup_lng, city_id INTO v_lat, v_lng, v_store_city
    FROM public.restaurants WHERE id = _store_id;
  ELSE
    SELECT NULL::double precision, NULL::double precision, city_id, ships_nationwide
    INTO v_lat, v_lng, v_store_city, v_nationwide
    FROM public.grocery_stores WHERE id = _store_id;
  END IF;

  IF v_lat IS NOT NULL AND v_lng IS NOT NULL AND _lat IS NOT NULL AND _lng IS NOT NULL THEN
    v_km := ROUND(public.haversine_km(v_lat, v_lng, _lat, _lng)::numeric, 2);
  END IF;

  -- Decide the mode
  IF _city_id IS NOT NULL AND v_store_city IS NOT NULL AND _city_id <> v_store_city THEN
    v_mode := CASE WHEN EXISTS (
      SELECT 1 FROM public.intercity_routes r
      WHERE r.from_city_id = v_store_city AND r.is_active
        AND (r.to_city_id = _city_id OR r.to_city_id IS NULL)
    ) THEN 'intercity' ELSE 'courier' END;
  ELSIF _store_kind = 'food' THEN
    v_mode := 'rider';
  ELSIF v_weight > 15 THEN
    v_mode := 'loader';
  ELSE
    v_mode := 'rider';
  END IF;

  IF v_mode = 'intercity' THEN
    SELECT r.flat_fee + r.per_kg_fee * v_weight, vt.id, vt.code, COALESCE(vt.name_ur, vt.name)
    INTO v_fee, v_vehicle_id, v_vehicle_code, v_vehicle_name
    FROM public.intercity_routes r
    LEFT JOIN public.vehicle_types vt ON vt.id = r.vehicle_type_id
    WHERE r.from_city_id = v_store_city AND r.is_active
      AND (r.to_city_id = _city_id OR r.to_city_id IS NULL)
    ORDER BY (r.to_city_id = _city_id) DESC, r.distance_km
    LIMIT 1;
    v_fee := COALESCE(v_fee, 0);
  ELSE
    SELECT * INTO v_card
    FROM public.delivery_rate_cards c
    WHERE c.is_active AND c.mode = v_mode
      AND (c.city_id = COALESCE(_city_id, v_store_city) OR c.city_id IS NULL)
      AND (c.max_weight_kg IS NULL OR v_weight <= c.max_weight_kg)
    ORDER BY (c.city_id IS NOT NULL) DESC, c.sort_order, c.max_weight_kg NULLS LAST
    LIMIT 1;

    IF v_card.id IS NULL THEN
      -- fall back to the city's legacy flat fee
      SELECT COALESCE(delivery_fee, 0) INTO v_fee FROM public.cities WHERE id = COALESCE(_city_id, v_store_city);
      v_fee := COALESCE(v_fee, 0);
      v_needs_quote := v_weight > 50;
    ELSE
      SELECT COALESCE(SUM(s.extra_fee + s.per_kg_fee * GREATEST(v_weight - s.min_kg, 0)), 0)
      INTO v_slab_fee
      FROM public.delivery_weight_slabs s
      WHERE s.rate_card_id = v_card.id
        AND v_weight >= s.min_kg AND (s.max_kg IS NULL OR v_weight <= s.max_kg);

      v_distance_fee := v_card.per_km * GREATEST(v_km - v_card.free_km, 0);
      v_fee := v_card.base_fee + v_distance_fee + COALESCE(v_slab_fee, 0);
      IF v_fee < v_card.min_fee THEN v_fee := v_card.min_fee; END IF;
      IF v_card.max_fee IS NOT NULL AND v_fee > v_card.max_fee THEN v_fee := v_card.max_fee; END IF;
      IF v_card.free_above_amount IS NOT NULL AND COALESCE(_subtotal, 0) >= v_card.free_above_amount THEN v_fee := 0; END IF;
      IF v_card.vehicle_type_id IS NOT NULL THEN
        SELECT id, code, COALESCE(name_ur, name) INTO v_vehicle_id, v_vehicle_code, v_vehicle_name
        FROM public.vehicle_types WHERE id = v_card.vehicle_type_id;
      END IF;
    END IF;
  END IF;

  IF v_vehicle_id IS NULL THEN
    SELECT id, code, COALESCE(name_ur, name) INTO v_vehicle_id, v_vehicle_code, v_vehicle_name
    FROM public.vehicle_types
    WHERE is_active AND capacity_kg >= v_weight ORDER BY capacity_kg LIMIT 1;
  END IF;

  IF v_vehicle_id IS NULL AND v_weight > 0 THEN v_needs_quote := true; END IF;

  RETURN jsonb_build_object(
    'mode', v_mode,
    'distance_km', v_km,
    'weight_kg', v_weight,
    'vehicle_code', v_vehicle_code,
    'vehicle_name', v_vehicle_name,
    'vehicle_type_id', v_vehicle_id,
    'fee', ROUND(COALESCE(v_fee, 0), 0),
    'needs_quote', v_needs_quote,
    'breakdown', jsonb_build_object(
      'base', COALESCE(v_card.base_fee, 0),
      'per_km', COALESCE(v_card.per_km, 0),
      'distance_fee', ROUND(COALESCE(v_distance_fee, 0), 0),
      'weight_fee', ROUND(COALESCE(v_slab_fee, 0), 0),
      'rate_card', v_card.label
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.quote_delivery(text, uuid, uuid, double precision, double precision, numeric, numeric) TO anon, authenticated, service_role;