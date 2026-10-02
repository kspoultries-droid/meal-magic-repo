CREATE OR REPLACE FUNCTION public.record_rider_earning(_kind text, _order_id uuid, _rider uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.rider_pay_plans%ROWTYPE; v_km numeric := 0; v_batch boolean := false; v_base numeric; v_dist numeric; v_total numeric;
BEGIN
  IF _rider IS NULL THEN RETURN; END IF;
  p := public.resolve_rider_pay(_rider);
  IF p.id IS NULL THEN RETURN; END IF;

  SELECT COALESCE(distance_km,0), COALESCE(is_batch,false) INTO v_km, v_batch FROM public.delivery_offers
    WHERE order_id = _order_id AND rider_id = _rider AND status = 'accepted'
    ORDER BY created_at DESC LIMIT 1;
  v_km := COALESCE(v_km,0); v_batch := COALESCE(v_batch,false);

  v_base := CASE WHEN p.pay_type = 'salaried' THEN 0 ELSE COALESCE(p.per_order_fee,0) END;
  -- Batched pickup: rider already at the restaurant, so half base pay; distance paid in full
  IF v_batch THEN v_base := ROUND(v_base * 0.5); END IF;
  v_dist := ROUND(COALESCE(p.per_km_fee,0) * v_km);
  v_total := v_base + v_dist;
  IF NOT v_batch AND p.pay_type <> 'salaried' THEN v_total := GREATEST(COALESCE(p.min_order_pay,0), v_total); END IF;

  INSERT INTO public.rider_earnings (rider_id, order_kind, order_id, distance_km, base_pay, distance_pay, amount)
  VALUES (_rider, _kind, _order_id, v_km, v_base, v_dist, v_total)
  ON CONFLICT (order_kind, order_id) DO NOTHING;
  IF NOT FOUND THEN RETURN; END IF;

  PERFORM set_config('app.bypass_rider_guard','on', true);
  UPDATE public.riders SET total_earnings = COALESCE(total_earnings,0) + v_total, updated_at = now() WHERE id = _rider;
  PERFORM set_config('app.bypass_rider_guard','off', true);
END; $$;
REVOKE EXECUTE ON FUNCTION public.record_rider_earning(text,uuid,uuid) FROM PUBLIC, anon, authenticated;