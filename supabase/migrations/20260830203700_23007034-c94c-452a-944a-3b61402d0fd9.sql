-- 1. commission_rules
CREATE TABLE public.commission_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sector text NOT NULL UNIQUE,
  label text,
  rate numeric NOT NULL DEFAULT 15,
  min_commission numeric NOT NULL DEFAULT 0,
  max_commission numeric,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.commission_rules TO authenticated;
GRANT ALL ON public.commission_rules TO service_role;
ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commission_rules_read" ON public.commission_rules
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "commission_rules_admin_all" ON public.commission_rules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_commission_rules_updated
  BEFORE UPDATE ON public.commission_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.commission_rules (sector, label, rate, min_commission) VALUES
  ('food', 'ریستوران / فوڈ', 15, 0),
  ('grocery', 'گروسری', 8, 0),
  ('wholesale', 'ہول سیل بازار', 5, 0),
  ('service', 'ہوم سروسز', 20, 0),
  ('partner', 'پارٹنر API (ApnaHub)', 10, 0);

-- 2. platform_commissions ledger
CREATE TABLE public.platform_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_kind text NOT NULL,
  order_id uuid NOT NULL,
  vendor_id uuid,
  city_id uuid,
  sector text NOT NULL,
  partner_channel text NOT NULL DEFAULT 'easylife',
  gross numeric NOT NULL DEFAULT 0,
  rate numeric NOT NULL DEFAULT 0,
  commission numeric NOT NULL DEFAULT 0,
  delivery_fee numeric NOT NULL DEFAULT 0,
  net_payable numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_kind, order_id)
);

CREATE INDEX idx_platform_commissions_vendor ON public.platform_commissions (vendor_id, created_at DESC);
CREATE INDEX idx_platform_commissions_created ON public.platform_commissions (created_at DESC);

GRANT SELECT ON public.platform_commissions TO authenticated;
GRANT ALL ON public.platform_commissions TO service_role;
ALTER TABLE public.platform_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commissions_vendor_read" ON public.platform_commissions
  FOR SELECT TO authenticated USING (vendor_id = auth.uid());
CREATE POLICY "commissions_staff_read" ON public.platform_commissions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'));
CREATE POLICY "commissions_admin_update" ON public.platform_commissions
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_platform_commissions_updated
  BEFORE UPDATE ON public.platform_commissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. rate resolver: per-vendor override wins, else sector rule
CREATE OR REPLACE FUNCTION public.resolve_commission_rate(_vendor_id uuid, _sector text)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate numeric;
BEGIN
  IF _vendor_id IS NOT NULL THEN
    SELECT commission_rate INTO v_rate FROM public.payout_settings WHERE user_id = _vendor_id LIMIT 1;
  END IF;
  IF v_rate IS NULL THEN
    SELECT rate INTO v_rate FROM public.commission_rules WHERE sector = _sector AND is_active LIMIT 1;
  END IF;
  RETURN COALESCE(v_rate, 15);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.resolve_commission_rate(uuid, text) FROM anon, authenticated;

-- 4. ledger writer (idempotent)
CREATE OR REPLACE FUNCTION public.record_commission(
  _order_kind text, _order_id uuid, _vendor_id uuid, _city_id uuid,
  _sector text, _total numeric, _delivery_fee numeric, _channel text DEFAULT 'easylife'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gross numeric;
  v_rate numeric;
  v_comm numeric;
  v_min numeric;
  v_max numeric;
BEGIN
  v_gross := GREATEST(0, COALESCE(_total,0) - COALESCE(_delivery_fee,0));
  v_rate := public.resolve_commission_rate(_vendor_id, _sector);
  v_comm := ROUND(v_gross * v_rate / 100.0);

  SELECT min_commission, max_commission INTO v_min, v_max
  FROM public.commission_rules WHERE sector = _sector LIMIT 1;

  IF v_gross > 0 AND v_min IS NOT NULL AND v_comm < v_min THEN v_comm := v_min; END IF;
  IF v_max IS NOT NULL AND v_comm > v_max THEN v_comm := v_max; END IF;
  IF v_comm > v_gross THEN v_comm := v_gross; END IF;

  INSERT INTO public.platform_commissions
    (order_kind, order_id, vendor_id, city_id, sector, partner_channel, gross, rate, commission, delivery_fee, net_payable)
  VALUES
    (_order_kind, _order_id, _vendor_id, _city_id, _sector, COALESCE(_channel,'easylife'),
     v_gross, v_rate, v_comm, COALESCE(_delivery_fee,0), GREATEST(0, v_gross - v_comm))
  ON CONFLICT (order_kind, order_id) DO NOTHING;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_commission(text, uuid, uuid, uuid, text, numeric, numeric, text) FROM anon, authenticated;

-- 5. triggers
CREATE OR REPLACE FUNCTION public.commission_on_food_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid;
BEGIN
  IF NEW.status IN ('delivered','completed') AND COALESCE(OLD.status,'') NOT IN ('delivered','completed') THEN
    SELECT owner_id INTO v_owner FROM public.restaurants WHERE id = NEW.restaurant_id;
    PERFORM public.record_commission('food', NEW.id, v_owner, NEW.city_id, 'food',
      NEW.total_amount, COALESCE(NEW.delivery_fee,0), 'easylife');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_commission_food
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.commission_on_food_order();

CREATE OR REPLACE FUNCTION public.commission_on_grocery_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid; v_type text; v_sector text;
BEGIN
  IF NEW.status IN ('delivered','completed') AND COALESCE(OLD.status,'') NOT IN ('delivered','completed') THEN
    SELECT owner_id, store_type INTO v_owner, v_type FROM public.grocery_stores WHERE id = NEW.store_id;
    v_sector := CASE WHEN v_type = 'wholesale' THEN 'wholesale' ELSE 'grocery' END;
    PERFORM public.record_commission(v_sector, NEW.id, v_owner, NEW.city_id, v_sector,
      NEW.total_amount, COALESCE(NEW.delivery_fee,0), 'easylife');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_commission_grocery
  AFTER UPDATE ON public.grocery_cart_orders
  FOR EACH ROW EXECUTE FUNCTION public.commission_on_grocery_order();

CREATE OR REPLACE FUNCTION public.commission_on_service_booking()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('completed','delivered') AND COALESCE(OLD.status,'') NOT IN ('completed','delivered') THEN
    PERFORM public.record_commission('service', NEW.id, NULL, NEW.city_id, 'service',
      NEW.total_amount, 0, 'easylife');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_commission_service
  AFTER UPDATE ON public.service_bookings
  FOR EACH ROW EXECUTE FUNCTION public.commission_on_service_booking();

-- 6. backfill existing completed orders
INSERT INTO public.platform_commissions
  (order_kind, order_id, vendor_id, city_id, sector, gross, rate, commission, delivery_fee, net_payable, created_at)
SELECT 'food', o.id, r.owner_id, o.city_id, 'food',
  GREATEST(0, o.total_amount - COALESCE(o.delivery_fee,0)),
  COALESCE(r.commission_rate, 15),
  ROUND(GREATEST(0, o.total_amount - COALESCE(o.delivery_fee,0)) * COALESCE(r.commission_rate,15) / 100.0),
  COALESCE(o.delivery_fee,0),
  GREATEST(0, GREATEST(0, o.total_amount - COALESCE(o.delivery_fee,0)) - ROUND(GREATEST(0, o.total_amount - COALESCE(o.delivery_fee,0)) * COALESCE(r.commission_rate,15) / 100.0)),
  o.created_at
FROM public.orders o
JOIN public.restaurants r ON r.id = o.restaurant_id
WHERE o.status IN ('delivered','completed')
ON CONFLICT (order_kind, order_id) DO NOTHING;

INSERT INTO public.platform_commissions
  (order_kind, order_id, vendor_id, city_id, sector, gross, rate, commission, delivery_fee, net_payable, created_at)
SELECT CASE WHEN s.store_type = 'wholesale' THEN 'wholesale' ELSE 'grocery' END,
  g.id, s.owner_id, g.city_id,
  CASE WHEN s.store_type = 'wholesale' THEN 'wholesale' ELSE 'grocery' END,
  GREATEST(0, g.total_amount - COALESCE(g.delivery_fee,0)),
  CASE WHEN s.store_type = 'wholesale' THEN 5 ELSE 8 END,
  ROUND(GREATEST(0, g.total_amount - COALESCE(g.delivery_fee,0)) * (CASE WHEN s.store_type = 'wholesale' THEN 5 ELSE 8 END) / 100.0),
  COALESCE(g.delivery_fee,0),
  GREATEST(0, GREATEST(0, g.total_amount - COALESCE(g.delivery_fee,0)) - ROUND(GREATEST(0, g.total_amount - COALESCE(g.delivery_fee,0)) * (CASE WHEN s.store_type = 'wholesale' THEN 5 ELSE 8 END) / 100.0)),
  g.created_at
FROM public.grocery_cart_orders g
JOIN public.grocery_stores s ON s.id = g.store_id
WHERE g.status IN ('delivered','completed')
ON CONFLICT (order_kind, order_id) DO NOTHING;

INSERT INTO public.platform_commissions
  (order_kind, order_id, vendor_id, city_id, sector, gross, rate, commission, delivery_fee, net_payable, created_at)
SELECT 'service', b.id, NULL, b.city_id, 'service',
  GREATEST(0, b.total_amount), 20,
  ROUND(GREATEST(0, b.total_amount) * 20 / 100.0), 0,
  GREATEST(0, GREATEST(0, b.total_amount) - ROUND(GREATEST(0, b.total_amount) * 20 / 100.0)),
  b.created_at
FROM public.service_bookings b
WHERE b.status IN ('completed','delivered')
ON CONFLICT (order_kind, order_id) DO NOTHING;