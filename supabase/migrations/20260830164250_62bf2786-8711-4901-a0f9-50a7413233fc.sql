-- Allow the settlement triggers to bypass the rider financial guard
CREATE OR REPLACE FUNCTION public.protect_rider_financials()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('app.bypass_rider_guard', true) = 'on'
     OR auth.uid() IS NULL
     OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  NEW.wallet_balance := OLD.wallet_balance;
  NEW.total_earnings := OLD.total_earnings;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.settle_order_on_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered' THEN
    IF NEW.rider_id IS NOT NULL THEN
      PERFORM set_config('app.bypass_rider_guard', 'on', true);
      UPDATE public.riders
        SET total_earnings = COALESCE(total_earnings, 0) + COALESCE(NEW.delivery_fee, 0),
            wallet_balance = COALESCE(wallet_balance, 0) + COALESCE(NEW.total_amount, 0),
            updated_at = now()
      WHERE id = NEW.rider_id;
      PERFORM set_config('app.bypass_rider_guard', 'off', true);
    END IF;
    IF COALESCE(NEW.payment_method, 'cod') = 'cod' THEN
      NEW.payment_status := 'paid';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.settle_grocery_order_on_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('delivered','completed')
     AND COALESCE(OLD.status,'') NOT IN ('delivered','completed')
     AND NEW.rider_id IS NOT NULL THEN
    PERFORM set_config('app.bypass_rider_guard', 'on', true);
    UPDATE public.riders
      SET total_earnings = COALESCE(total_earnings,0) + COALESCE(NEW.delivery_fee,0),
          wallet_balance = COALESCE(wallet_balance,0) + COALESCE(NEW.total_amount,0),
          updated_at = now()
      WHERE id = NEW.rider_id;
    PERFORM set_config('app.bypass_rider_guard', 'off', true);
  END IF;
  RETURN NEW;
END;
$$;

-- Rider-facing summary: earnings, cash collected, remitted, due
CREATE OR REPLACE FUNCTION public.get_rider_summary()
RETURNS TABLE(
  today_deliveries int,
  today_earnings numeric,
  total_deliveries int,
  total_earnings numeric,
  cash_collected numeric,
  remitted numeric,
  pending_remit numeric,
  cash_due numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
WITH f AS (
  SELECT delivery_fee, total_amount, payment_method, created_at
  FROM public.orders
  WHERE rider_id = auth.uid() AND status IN ('delivered','completed')
), g AS (
  SELECT delivery_fee, total_amount, payment_method, created_at
  FROM public.grocery_cart_orders
  WHERE rider_id = auth.uid() AND status IN ('delivered','completed')
), gl AS (
  SELECT delivery_fee, total_amount, NULL::text AS payment_method, created_at
  FROM public.grocery_list_orders
  WHERE rider_id = auth.uid() AND status IN ('delivered','completed')
), all_o AS (
  SELECT * FROM f UNION ALL SELECT * FROM g UNION ALL SELECT * FROM gl
), r AS (
  SELECT
    COALESCE(SUM(amount) FILTER (WHERE status = 'approved'), 0) AS remitted,
    COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) AS pending_remit
  FROM public.rider_remittances WHERE rider_id = auth.uid()
)
SELECT
  COUNT(*) FILTER (WHERE (created_at AT TIME ZONE 'Asia/Karachi')::date = (now() AT TIME ZONE 'Asia/Karachi')::date)::int,
  COALESCE(SUM(delivery_fee) FILTER (WHERE (created_at AT TIME ZONE 'Asia/Karachi')::date = (now() AT TIME ZONE 'Asia/Karachi')::date), 0),
  COUNT(*)::int,
  COALESCE(SUM(delivery_fee), 0),
  COALESCE(SUM(total_amount) FILTER (WHERE COALESCE(payment_method,'cod') = 'cod'), 0),
  r.remitted,
  r.pending_remit,
  GREATEST(0, COALESCE(SUM(total_amount) FILTER (WHERE COALESCE(payment_method,'cod') = 'cod'), 0)
              - COALESCE(SUM(delivery_fee), 0) - r.remitted)
FROM all_o, r GROUP BY r.remitted, r.pending_remit;
$$;

REVOKE EXECUTE ON FUNCTION public.get_rider_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_rider_summary() TO authenticated;

-- Backfill historical rider earnings
UPDATE public.riders r
SET total_earnings = x.fees, updated_at = now()
FROM (
  SELECT rider_id, SUM(delivery_fee) AS fees FROM (
    SELECT rider_id, COALESCE(delivery_fee,0) AS delivery_fee FROM public.orders WHERE rider_id IS NOT NULL AND status IN ('delivered','completed')
    UNION ALL
    SELECT rider_id, COALESCE(delivery_fee,0) FROM public.grocery_cart_orders WHERE rider_id IS NOT NULL AND status IN ('delivered','completed')
    UNION ALL
    SELECT rider_id, COALESCE(delivery_fee,0) FROM public.grocery_list_orders WHERE rider_id IS NOT NULL AND status IN ('delivered','completed')
  ) t GROUP BY rider_id
) x
WHERE r.id = x.rider_id;