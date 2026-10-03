CREATE OR REPLACE FUNCTION public.rider_level_info(_rider uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r uuid := COALESCE(_rider, auth.uid()); rt numeric; acc numeric; total int; wk int; lvl int; score numeric;
BEGIN
  IF auth.uid() IS NOT NULL AND r <> auth.uid() AND NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'not allowed'; END IF;
  SELECT COALESCE(rating,0), COALESCE(acceptance_rate,0) INTO rt, acc FROM riders WHERE id = r;
  SELECT count(*) INTO total FROM rider_earnings WHERE rider_id = r AND order_kind <> 'weekly_bonus';
  SELECT count(*) INTO wk FROM rider_earnings WHERE rider_id = r AND order_kind <> 'weekly_bonus' AND created_at >= date_trunc('week', now());
  score := COALESCE(rt,0)*10 + LEAST(COALESCE(acc,0),100)*0.3 + LEAST(total,500)*0.04;
  lvl := CASE WHEN score >= 85 THEN 5 WHEN score >= 70 THEN 4 WHEN score >= 50 THEN 3 WHEN score >= 30 THEN 2 ELSE 1 END;
  RETURN jsonb_build_object('level', lvl, 'score', round(score), 'rating', rt, 'acceptance', acc,
    'total_deliveries', total, 'week_deliveries', wk,
    'book_days_ahead', CASE WHEN lvl >= 4 THEN 7 WHEN lvl = 3 THEN 4 ELSE 2 END,
    'bonus_tiers', jsonb_build_array(jsonb_build_object('target',25,'amount',500), jsonb_build_object('target',50,'amount',1200), jsonb_build_object('target',80,'amount',2200)));
END $$;

CREATE OR REPLACE FUNCTION public.award_weekly_rider_bonus()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE wk_start timestamptz := date_trunc('week', now()) - interval '7 days'; rec record; amt numeric; n int := 0;
BEGIN
  FOR rec IN SELECT rider_id, count(*) c FROM rider_earnings
    WHERE order_kind <> 'weekly_bonus' AND status <> 'cancelled'
      AND created_at >= wk_start AND created_at < wk_start + interval '7 days'
    GROUP BY rider_id LOOP
    amt := CASE WHEN rec.c >= 80 THEN 2200 WHEN rec.c >= 50 THEN 1200 WHEN rec.c >= 25 THEN 500 ELSE 0 END;
    IF amt > 0 THEN
      INSERT INTO rider_earnings(rider_id, order_kind, order_id, bonus, amount)
      VALUES (rec.rider_id, 'weekly_bonus', md5(rec.rider_id::text || wk_start::date::text)::uuid, amt, amt)
      ON CONFLICT (order_kind, order_id) DO NOTHING;
      IF FOUND THEN
        n := n + 1;
        PERFORM notify_user(rec.rider_id, 'bonus', '🎉 ہفتہ وار بونس', 'پچھلے ہفتے ' || rec.c || ' ڈلیوریز پر Rs ' || amt || ' بونس آپ کے کھاتے میں لکھ دیا گیا', '/rider');
      END IF;
    END IF;
  END LOOP;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.award_weekly_rider_bonus() FROM public, anon, authenticated;

SELECT cron.schedule('weekly-rider-bonus', '30 19 * * 0', $$SELECT public.award_weekly_rider_bonus()$$);