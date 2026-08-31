
-- 1. Vendor-funded delivery -------------------------------------------------
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS pays_delivery_fee boolean NOT NULL DEFAULT false;
ALTER TABLE public.grocery_stores ADD COLUMN IF NOT EXISTS pays_delivery_fee boolean NOT NULL DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_fee_payer text NOT NULL DEFAULT 'customer';
ALTER TABLE public.grocery_cart_orders ADD COLUMN IF NOT EXISTS delivery_fee_payer text NOT NULL DEFAULT 'customer';

-- customer is not charged when the vendor funds delivery
CREATE OR REPLACE FUNCTION public.apply_delivery_fee_payer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_vendor_pays boolean := false;
BEGIN
  IF TG_TABLE_NAME = 'orders' THEN
    SELECT COALESCE(pays_delivery_fee,false) INTO v_vendor_pays FROM public.restaurants WHERE id = NEW.restaurant_id;
  ELSE
    SELECT COALESCE(pays_delivery_fee,false) INTO v_vendor_pays FROM public.grocery_stores WHERE id = NEW.store_id;
  END IF;

  IF v_vendor_pays AND COALESCE(NEW.delivery_fee,0) > 0 THEN
    NEW.delivery_fee_payer := 'vendor';
    NEW.total_amount := GREATEST(0, COALESCE(NEW.total_amount,0) - COALESCE(NEW.delivery_fee,0));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS a_apply_delivery_fee_payer ON public.orders;
CREATE TRIGGER a_apply_delivery_fee_payer BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.apply_delivery_fee_payer();
DROP TRIGGER IF EXISTS a_apply_delivery_fee_payer ON public.grocery_cart_orders;
CREATE TRIGGER a_apply_delivery_fee_payer BEFORE INSERT ON public.grocery_cart_orders
  FOR EACH ROW EXECUTE FUNCTION public.apply_delivery_fee_payer();

-- 2. Rider pay plans --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rider_pay_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  city_id uuid REFERENCES public.cities(id) ON DELETE CASCADE,
  pay_type text NOT NULL DEFAULT 'per_order',
  monthly_salary numeric NOT NULL DEFAULT 0,
  per_order_fee numeric NOT NULL DEFAULT 60,
  per_km_fee numeric NOT NULL DEFAULT 0,
  min_order_pay numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rider_pay_plans TO authenticated;
GRANT ALL ON public.rider_pay_plans TO service_role;
ALTER TABLE public.rider_pay_plans ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS rider_pay_plans_rider_uniq ON public.rider_pay_plans (rider_id) WHERE rider_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS rider_pay_plans_city_uniq ON public.rider_pay_plans (city_id) WHERE rider_id IS NULL AND city_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS rider_pay_plans_global_uniq ON public.rider_pay_plans ((true)) WHERE rider_id IS NULL AND city_id IS NULL;

DROP POLICY IF EXISTS "Admins manage rider pay plans" ON public.rider_pay_plans;
CREATE POLICY "Admins manage rider pay plans" ON public.rider_pay_plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Riders read own pay plan" ON public.rider_pay_plans;
CREATE POLICY "Riders read own pay plan" ON public.rider_pay_plans FOR SELECT TO authenticated
  USING (rider_id = auth.uid());

CREATE TRIGGER trg_rider_pay_plans_updated BEFORE UPDATE ON public.rider_pay_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.rider_pay_plans (rider_id, city_id, pay_type, monthly_salary, per_order_fee, per_km_fee, min_order_pay)
SELECT NULL, NULL, 'per_order', 0, 60, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM public.rider_pay_plans WHERE rider_id IS NULL AND city_id IS NULL);

-- 3. Rider earnings ledger --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rider_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_kind text NOT NULL,
  order_id uuid NOT NULL,
  distance_km numeric NOT NULL DEFAULT 0,
  base_pay numeric NOT NULL DEFAULT 0,
  distance_pay numeric NOT NULL DEFAULT 0,
  bonus numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  payout_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_kind, order_id)
);
GRANT SELECT ON public.rider_earnings TO authenticated;
GRANT ALL ON public.rider_earnings TO service_role;
ALTER TABLE public.rider_earnings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Riders read own earnings" ON public.rider_earnings;
CREATE POLICY "Riders read own earnings" ON public.rider_earnings FOR SELECT TO authenticated
  USING (rider_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'support'));
CREATE INDEX IF NOT EXISTS rider_earnings_rider_idx ON public.rider_earnings (rider_id, status, created_at DESC);

-- 4. Rider salary payouts ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rider_salary_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  salary_amount numeric NOT NULL DEFAULT 0,
  order_earnings numeric NOT NULL DEFAULT 0,
  bonus numeric NOT NULL DEFAULT 0,
  deduction numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  from_account_id uuid REFERENCES public.payment_accounts(id),
  reference_no text,
  note text,
  status text NOT NULL DEFAULT 'paid',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rider_salary_payouts TO authenticated;
GRANT ALL ON public.rider_salary_payouts TO service_role;
ALTER TABLE public.rider_salary_payouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Riders read own salary payouts" ON public.rider_salary_payouts;
CREATE POLICY "Riders read own salary payouts" ON public.rider_salary_payouts FOR SELECT TO authenticated
  USING (rider_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- 5. Pay resolution + earning recording ------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_rider_pay(_rider uuid)
RETURNS public.rider_pay_plans LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.rider_pay_plans%ROWTYPE; v_city uuid;
BEGIN
  SELECT * INTO p FROM public.rider_pay_plans WHERE rider_id = _rider AND is_active LIMIT 1;
  IF p.id IS NOT NULL THEN RETURN p; END IF;
  SELECT city_id INTO v_city FROM public.riders WHERE id = _rider;
  IF v_city IS NOT NULL THEN
    SELECT * INTO p FROM public.rider_pay_plans WHERE rider_id IS NULL AND city_id = v_city AND is_active LIMIT 1;
    IF p.id IS NOT NULL THEN RETURN p; END IF;
  END IF;
  SELECT * INTO p FROM public.rider_pay_plans WHERE rider_id IS NULL AND city_id IS NULL LIMIT 1;
  RETURN p;
END; $$;

CREATE OR REPLACE FUNCTION public.record_rider_earning(_kind text, _order_id uuid, _rider uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.rider_pay_plans%ROWTYPE; v_km numeric := 0; v_base numeric; v_dist numeric; v_total numeric;
BEGIN
  IF _rider IS NULL THEN RETURN; END IF;
  p := public.resolve_rider_pay(_rider);
  IF p.id IS NULL THEN RETURN; END IF;

  SELECT COALESCE(distance_km,0) INTO v_km FROM public.delivery_offers
    WHERE order_id = _order_id AND rider_id = _rider AND status = 'accepted'
    ORDER BY created_at DESC LIMIT 1;
  v_km := COALESCE(v_km,0);

  v_base := CASE WHEN p.pay_type = 'salaried' THEN 0 ELSE COALESCE(p.per_order_fee,0) END;
  v_dist := ROUND(COALESCE(p.per_km_fee,0) * v_km);
  v_total := GREATEST(COALESCE(p.min_order_pay,0), v_base + v_dist);
  IF p.pay_type = 'salaried' AND COALESCE(p.min_order_pay,0) = 0 THEN v_total := v_base + v_dist; END IF;

  INSERT INTO public.rider_earnings (rider_id, order_kind, order_id, distance_km, base_pay, distance_pay, amount)
  VALUES (_rider, _kind, _order_id, v_km, v_base, v_dist, v_total)
  ON CONFLICT (order_kind, order_id) DO NOTHING;

  PERFORM set_config('app.bypass_rider_guard','on', true);
  UPDATE public.riders SET total_earnings = COALESCE(total_earnings,0) + v_total, updated_at = now() WHERE id = _rider;
  PERFORM set_config('app.bypass_rider_guard','off', true);
END; $$;

-- 6. Settlement triggers: cash-in-hand = full COD, earnings = plan based ----
CREATE OR REPLACE FUNCTION public.settle_order_on_delivery()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered' THEN
    IF NEW.rider_id IS NOT NULL THEN
      IF COALESCE(NEW.payment_method,'cod') = 'cod' THEN
        PERFORM set_config('app.bypass_rider_guard','on', true);
        UPDATE public.riders SET wallet_balance = COALESCE(wallet_balance,0) + COALESCE(NEW.total_amount,0), updated_at = now()
          WHERE id = NEW.rider_id;
        PERFORM set_config('app.bypass_rider_guard','off', true);
      END IF;
      PERFORM public.record_rider_earning('food', NEW.id, NEW.rider_id);
    END IF;
    IF COALESCE(NEW.payment_method, 'cod') = 'cod' THEN
      NEW.payment_status := 'paid';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.settle_grocery_order_on_delivery()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('delivered','completed')
     AND COALESCE(OLD.status,'') NOT IN ('delivered','completed')
     AND NEW.rider_id IS NOT NULL THEN
    IF COALESCE(NEW.payment_method,'cod') = 'cod' THEN
      PERFORM set_config('app.bypass_rider_guard','on', true);
      UPDATE public.riders SET wallet_balance = COALESCE(wallet_balance,0) + COALESCE(NEW.total_amount,0), updated_at = now()
        WHERE id = NEW.rider_id;
      PERFORM set_config('app.bypass_rider_guard','off', true);
    END IF;
    PERFORM public.record_rider_earning(TG_TABLE_NAME, NEW.id, NEW.rider_id);
  END IF;
  RETURN NEW;
END; $$;

-- 7. Cash due = full COD collected - remitted (no delivery-fee deduction) ---
CREATE OR REPLACE FUNCTION public.rider_cash_due(_rider uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH o AS (
    SELECT total_amount, payment_method FROM public.orders
      WHERE rider_id = _rider AND status IN ('delivered','completed')
    UNION ALL
    SELECT total_amount, payment_method FROM public.grocery_cart_orders
      WHERE rider_id = _rider AND status IN ('delivered','completed')
    UNION ALL
    SELECT total_amount, 'cod'::text FROM public.grocery_list_orders
      WHERE rider_id = _rider AND status IN ('delivered','completed')
  ), r AS (
    SELECT COALESCE(SUM(amount) FILTER (WHERE status IN ('approved','pending')),0) AS settled
    FROM public.rider_remittances WHERE rider_id = _rider
  )
  SELECT GREATEST(0,
    COALESCE((SELECT SUM(total_amount) FROM o WHERE COALESCE(payment_method,'cod')='cod'),0)
    - (SELECT settled FROM r));
$$;

CREATE OR REPLACE FUNCTION public.get_rider_summary()
RETURNS TABLE(today_deliveries integer, today_earnings numeric, total_deliveries integer, total_earnings numeric, cash_collected numeric, remitted numeric, pending_remit numeric, cash_due numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
WITH o AS (
  SELECT total_amount, payment_method, created_at FROM public.orders
    WHERE rider_id = auth.uid() AND status IN ('delivered','completed')
  UNION ALL
  SELECT total_amount, payment_method, created_at FROM public.grocery_cart_orders
    WHERE rider_id = auth.uid() AND status IN ('delivered','completed')
  UNION ALL
  SELECT total_amount, 'cod'::text, created_at FROM public.grocery_list_orders
    WHERE rider_id = auth.uid() AND status IN ('delivered','completed')
), e AS (
  SELECT amount, created_at FROM public.rider_earnings WHERE rider_id = auth.uid()
), r AS (
  SELECT COALESCE(SUM(amount) FILTER (WHERE status = 'approved'),0) AS remitted,
         COALESCE(SUM(amount) FILTER (WHERE status = 'pending'),0) AS pending_remit
  FROM public.rider_remittances WHERE rider_id = auth.uid()
)
SELECT
  (SELECT COUNT(*) FROM o WHERE (created_at AT TIME ZONE 'Asia/Karachi')::date = (now() AT TIME ZONE 'Asia/Karachi')::date)::int,
  (SELECT COALESCE(SUM(amount),0) FROM e WHERE (created_at AT TIME ZONE 'Asia/Karachi')::date = (now() AT TIME ZONE 'Asia/Karachi')::date),
  (SELECT COUNT(*) FROM o)::int,
  (SELECT COALESCE(SUM(amount),0) FROM e),
  (SELECT COALESCE(SUM(total_amount) FILTER (WHERE COALESCE(payment_method,'cod')='cod'),0) FROM o),
  r.remitted,
  r.pending_remit,
  GREATEST(0, (SELECT COALESCE(SUM(total_amount) FILTER (WHERE COALESCE(payment_method,'cod')='cod'),0) FROM o) - r.remitted - r.pending_remit)
FROM r;
$$;

-- 8. Vendor-funded delivery reduces vendor payable --------------------------
CREATE OR REPLACE FUNCTION public.record_commission(_order_kind text, _order_id uuid, _vendor_id uuid, _city_id uuid, _sector text, _total numeric, _delivery_fee numeric, _channel text DEFAULT 'easylife'::text, _vendor_pays_delivery boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_gross numeric; v_rate numeric; v_comm numeric; v_min numeric; v_max numeric; v_fee numeric;
BEGIN
  v_fee := COALESCE(_delivery_fee,0);
  v_gross := CASE WHEN _vendor_pays_delivery THEN COALESCE(_total,0)
                  ELSE GREATEST(0, COALESCE(_total,0) - v_fee) END;
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
     v_gross, v_rate, v_comm, v_fee,
     GREATEST(0, v_gross - v_comm - CASE WHEN _vendor_pays_delivery THEN v_fee ELSE 0 END))
  ON CONFLICT (order_kind, order_id) DO NOTHING;
END; $$;

CREATE OR REPLACE FUNCTION public.commission_on_food_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid;
BEGIN
  IF NEW.status IN ('delivered','completed') AND COALESCE(OLD.status,'') NOT IN ('delivered','completed') THEN
    SELECT owner_id INTO v_owner FROM public.restaurants WHERE id = NEW.restaurant_id;
    PERFORM public.record_commission('food', NEW.id, v_owner, NEW.city_id, 'food',
      NEW.total_amount, COALESCE(NEW.delivery_fee,0), 'easylife',
      COALESCE(NEW.delivery_fee_payer,'customer') = 'vendor');
  END IF;
  RETURN NEW;
END; $$;

-- 9. Admin pays a rider (salary + order earnings) from a bank account -------
CREATE OR REPLACE FUNCTION public.pay_rider(_rider uuid, _period_start date, _period_end date, _salary numeric, _bonus numeric, _deduction numeric, _from_account_id uuid, _reference_no text, _note text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_earn numeric; v_total numeric; v_payout uuid; v_bal numeric; v_label text;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Only admins can pay riders'; END IF;
  IF _period_end < _period_start THEN RAISE EXCEPTION 'مدت درست نہیں'; END IF;

  SELECT COALESCE(SUM(amount),0) INTO v_earn FROM public.rider_earnings
    WHERE rider_id = _rider AND status = 'pending'
      AND (created_at AT TIME ZONE 'Asia/Karachi')::date BETWEEN _period_start AND _period_end;

  v_total := COALESCE(_salary,0) + v_earn + COALESCE(_bonus,0) - COALESCE(_deduction,0);
  IF v_total <= 0 THEN RAISE EXCEPTION 'ادائیگی کی رقم صفر ہے'; END IF;

  IF _from_account_id IS NOT NULL THEN
    SELECT balance INTO v_bal FROM public.payment_accounts WHERE id = _from_account_id FOR UPDATE;
    IF v_bal IS NULL THEN RAISE EXCEPTION 'اکاؤنٹ نہیں ملا'; END IF;
    IF v_bal < v_total THEN RAISE EXCEPTION 'اس اکاؤنٹ میں کافی بیلنس نہیں (Rs %)', round(v_bal); END IF;
  END IF;

  INSERT INTO public.rider_salary_payouts
    (rider_id, period_start, period_end, salary_amount, order_earnings, bonus, deduction, total,
     from_account_id, reference_no, note, created_by)
  VALUES (_rider, _period_start, _period_end, COALESCE(_salary,0), v_earn, COALESCE(_bonus,0), COALESCE(_deduction,0),
     v_total, _from_account_id, _reference_no, _note, auth.uid())
  RETURNING id INTO v_payout;

  UPDATE public.rider_earnings SET status = 'paid', payout_id = v_payout
    WHERE rider_id = _rider AND status = 'pending'
      AND (created_at AT TIME ZONE 'Asia/Karachi')::date BETWEEN _period_start AND _period_end;

  IF _from_account_id IS NOT NULL THEN
    PERFORM set_config('app.bypass_ledger_guard','on', true);
    UPDATE public.payment_accounts SET balance = balance - v_total, updated_at = now()
      WHERE id = _from_account_id RETURNING balance INTO v_bal;
    SELECT full_name INTO v_label FROM public.profiles WHERE id = _rider;
    INSERT INTO public.bank_ledger (account_id, direction, amount, balance_after, source_type, source_id,
      counterparty_id, counterparty_label, reference_no, note, created_by)
    VALUES (_from_account_id, 'out', v_total, v_bal, 'rider_salary', v_payout,
      _rider, COALESCE(v_label,'رائیڈر'), _reference_no, _note, auth.uid());
  END IF;

  RETURN v_payout;
END; $$;

REVOKE EXECUTE ON FUNCTION public.pay_rider(uuid,date,date,numeric,numeric,numeric,uuid,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_rider_earning(text,uuid,uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.resolve_rider_pay(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.apply_delivery_fee_payer() FROM anon, authenticated;
