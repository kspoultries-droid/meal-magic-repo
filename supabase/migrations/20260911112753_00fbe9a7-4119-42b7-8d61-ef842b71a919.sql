-- lovable-cron-fallback-reviewed: 288 runs/day; shop open/close is purely time-based (clock-driven, no row event triggers it); replaces an existing every-minute HTTP cron with a lighter in-database job
CREATE OR REPLACE FUNCTION public.sync_shop_open_state()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _now text := to_char((now() AT TIME ZONE 'Asia/Karachi')::time, 'HH24:MI');
  _changed integer := 0;
  _n integer := 0;
BEGIN
  WITH target AS (
    SELECT id,
           CASE WHEN closing_time > opening_time
                THEN (_now >= opening_time AND _now < closing_time)
                ELSE (_now >= opening_time OR _now < closing_time)
           END AS should_be_open,
           is_active
      FROM public.grocery_stores
     WHERE opening_time IS NOT NULL AND closing_time IS NOT NULL
  )
  UPDATE public.grocery_stores g
     SET is_active = t.should_be_open
    FROM target t
   WHERE g.id = t.id AND t.is_active IS DISTINCT FROM t.should_be_open;
  GET DIAGNOSTICS _n = ROW_COUNT;
  _changed := _changed + _n;

  WITH target AS (
    SELECT id,
           CASE WHEN closing_time > opening_time
                THEN (_now >= opening_time AND _now < closing_time)
                ELSE (_now >= opening_time OR _now < closing_time)
           END AS should_be_open,
           is_active
      FROM public.restaurants
     WHERE opening_time IS NOT NULL AND closing_time IS NOT NULL
  )
  UPDATE public.restaurants r
     SET is_active = t.should_be_open
    FROM target t
   WHERE r.id = t.id AND t.is_active IS DISTINCT FROM t.should_be_open;
  GET DIAGNOSTICS _n = ROW_COUNT;
  _changed := _changed + _n;

  RETURN _changed;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_shop_open_state() FROM PUBLIC, anon, authenticated;

SELECT cron.unschedule(1);
SELECT cron.schedule('sync-shop-open-state', '*/5 * * * *', $$SELECT public.sync_shop_open_state();$$);