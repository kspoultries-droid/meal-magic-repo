-- ============ Vouchers / Deals System ============
CREATE TABLE IF NOT EXISTS public.vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  title_ur text,
  description text,
  discount_type text NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent','flat')),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  max_discount numeric,
  min_order numeric NOT NULL DEFAULT 0,
  scope text NOT NULL DEFAULT 'all' CHECK (scope IN ('all','food','grocery','wholesale')),
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  usage_limit integer,
  used_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.vouchers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.vouchers TO authenticated;
GRANT ALL ON public.vouchers TO service_role;

ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active vouchers"
ON public.vouchers FOR SELECT TO anon, authenticated
USING (is_active = true AND valid_from <= now() AND (valid_until IS NULL OR valid_until > now()));

CREATE POLICY "Admins manage vouchers"
ON public.vouchers FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Order discount columns
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS voucher_code text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.grocery_cart_orders ADD COLUMN IF NOT EXISTS voucher_code text;
ALTER TABLE public.grocery_cart_orders ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0;

-- ============ Validate voucher (checkout preview) ============
CREATE OR REPLACE FUNCTION public.validate_voucher(_code text, _scope text, _subtotal numeric)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v record;
  disc numeric;
BEGIN
  SELECT * INTO v FROM vouchers WHERE upper(code) = upper(trim(_code)) AND is_active = true;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'غلط یا غیر فعال کوڈ'); END IF;
  IF v.valid_from > now() THEN RETURN jsonb_build_object('ok', false, 'error', 'واؤچر ابھی فعال نہیں ہوا'); END IF;
  IF v.valid_until IS NOT NULL AND v.valid_until < now() THEN RETURN jsonb_build_object('ok', false, 'error', 'واؤچر کی میعاد ختم ہو چکی ہے'); END IF;
  IF v.usage_limit IS NOT NULL AND v.used_count >= v.usage_limit THEN RETURN jsonb_build_object('ok', false, 'error', 'واؤچر کی استعمال کی حد پوری ہو چکی'); END IF;
  IF v.scope <> 'all' AND v.scope <> _scope AND NOT (_scope = 'grocery' AND v.scope = 'wholesale') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'یہ کوڈ اس سیکشن پر لاگو نہیں ہوتا');
  END IF;
  IF _subtotal < v.min_order THEN
    RETURN jsonb_build_object('ok', false, 'error', 'کم از کم آرڈر Rs ' || v.min_order || ' ہونا چاہیے');
  END IF;
  disc := CASE WHEN v.discount_type = 'percent' THEN round(_subtotal * v.discount_value / 100) ELSE v.discount_value END;
  IF v.max_discount IS NOT NULL THEN disc := least(disc, v.max_discount); END IF;
  disc := least(disc, _subtotal);
  RETURN jsonb_build_object('ok', true, 'code', v.code, 'title', v.title, 'discount', disc);
END $$;

-- ============ Apply voucher to own pending order ============
CREATE OR REPLACE FUNCTION public.apply_voucher_to_order(_kind text, _order_id uuid, _code text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v record;
  sub numeric;
  disc numeric;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'لاگ اِن درکار ہے'); END IF;

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
    UPDATE grocery_cart_orders SET voucher_code = v.code, discount_amount = disc WHERE id = _order_id;
  ELSIF _kind = 'food' THEN
    SELECT total_amount INTO sub FROM orders
    WHERE id = _order_id AND customer_id = auth.uid() AND status = 'pending' AND voucher_code IS NULL;
    IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'آرڈر نہیں ملا یا واؤچر پہلے سے لاگو ہے'); END IF;
    IF v.scope NOT IN ('all','food') THEN RETURN jsonb_build_object('ok', false, 'error', 'یہ کوڈ یہاں لاگو نہیں'); END IF;
    IF sub < v.min_order THEN RETURN jsonb_build_object('ok', false, 'error', 'کم از کم آرڈر پورا نہیں'); END IF;
    disc := CASE WHEN v.discount_type = 'percent' THEN round(sub * v.discount_value / 100) ELSE v.discount_value END;
    IF v.max_discount IS NOT NULL THEN disc := least(disc, v.max_discount); END IF;
    disc := least(disc, sub);
    UPDATE orders SET voucher_code = v.code, discount_amount = disc WHERE id = _order_id;
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
END $$;

REVOKE EXECUTE ON FUNCTION public.validate_voucher(text, text, numeric) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.validate_voucher(text, text, numeric) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_voucher_to_order(text, uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.apply_voucher_to_order(text, uuid, text) TO authenticated;

-- Seed starter vouchers
INSERT INTO public.vouchers (code, title, title_ur, description, discount_type, discount_value, max_discount, min_order, scope, usage_limit, sort_order)
VALUES
  ('BAZAR10', '10% off Wholesale', 'بازار پر 10% رعایت', 'Wholesale order par 10% discount (max Rs 2000)', 'percent', 10, 2000, 5000, 'wholesale', NULL, 1),
  ('WELCOME100', 'Rs 100 Welcome Deal', 'ویلکم ڈیل Rs 100', 'Pehle order par Rs 100 off — har section par', 'flat', 100, NULL, 500, 'all', 500, 2),
  ('GROCERY5', '5% off Grocery', 'گروسری پر 5% رعایت', 'Grocery order par 5% discount (max Rs 300)', 'percent', 5, 300, 1000, 'grocery', NULL, 3)
ON CONFLICT (code) DO NOTHING;