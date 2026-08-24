CREATE OR REPLACE FUNCTION public.apply_voucher_to_order(_kind text, _order_id uuid, _code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    UPDATE grocery_cart_orders
      SET voucher_code = v.code,
          discount_amount = disc,
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
      SET voucher_code = v.code,
          discount_amount = disc,
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