CREATE OR REPLACE FUNCTION public.get_rider_summary()
 RETURNS TABLE(today_deliveries integer, today_earnings numeric, total_deliveries integer, total_earnings numeric, cash_collected numeric, remitted numeric, pending_remit numeric, cash_due numeric)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
WITH f AS (
  SELECT delivery_fee, total_amount, payment_method, created_at FROM public.orders
  WHERE rider_id = auth.uid() AND status IN ('delivered','completed')
), g AS (
  SELECT delivery_fee, total_amount, payment_method, created_at FROM public.grocery_cart_orders
  WHERE rider_id = auth.uid() AND status IN ('delivered','completed')
), gl AS (
  SELECT delivery_fee, total_amount, NULL::text AS payment_method, created_at FROM public.grocery_list_orders
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
              - COALESCE(SUM(delivery_fee), 0) - r.remitted - r.pending_remit)
FROM all_o, r GROUP BY r.remitted, r.pending_remit;
$function$;
REVOKE EXECUTE ON FUNCTION public.get_rider_summary() FROM anon;