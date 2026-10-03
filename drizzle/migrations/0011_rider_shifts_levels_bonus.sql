CREATE TABLE public.rider_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id uuid NOT NULL,
  shift_date date NOT NULL,
  slot text NOT NULL CHECK (slot IN ('morning','afternoon','evening','night')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rider_id, shift_date, slot)
);
GRANT SELECT, INSERT, DELETE ON public.rider_shifts TO authenticated;
GRANT ALL ON public.rider_shifts TO service_role;
ALTER TABLE public.rider_shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Riders manage own shifts" ON public.rider_shifts FOR ALL TO authenticated
  USING (rider_id = auth.uid() OR public.is_staff(auth.uid()))
  WITH CHECK (rider_id = auth.uid());

CREATE OR REPLACE FUNCTION public.rider_level_info(_rider uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r uuid := COALESCE(_rider, auth.uid()); rt numeric; acc numeric; total int; wk int; lvl int; score numeric;
BEGIN
  IF r <> auth.uid() AND NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'not allowed'; END IF;
  SELECT COALESCE(rating,0), COALESCE(acceptance_rate,0) INTO rt, acc FROM riders WHERE id = r;
  SELECT count(*) INTO total FROM rider_earnings WHERE rider_id = r;
  SELECT count(*) INTO wk FROM rider_earnings WHERE rider_id = r AND created_at >= date_trunc('week', now());
  score := COALESCE(rt,0)*10 + LEAST(COALESCE(acc,0),100)*0.3 + LEAST(total,500)*0.04;
  lvl := CASE WHEN score >= 85 THEN 5 WHEN score >= 70 THEN 4 WHEN score >= 50 THEN 3 WHEN score >= 30 THEN 2 ELSE 1 END;
  RETURN jsonb_build_object('level', lvl, 'score', round(score), 'rating', rt, 'acceptance', acc,
    'total_deliveries', total, 'week_deliveries', wk,
    'book_days_ahead', CASE WHEN lvl >= 4 THEN 7 WHEN lvl = 3 THEN 4 ELSE 2 END,
    'bonus_tiers', jsonb_build_array(jsonb_build_object('target',25,'amount',500), jsonb_build_object('target',50,'amount',1200), jsonb_build_object('target',80,'amount',2200)));
END $$;
REVOKE ALL ON FUNCTION public.rider_level_info(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rider_level_info(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_rider_shift() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ahead int; booked int;
BEGIN
  IF NEW.shift_date < current_date THEN RAISE EXCEPTION 'گزری ہوئی تاریخ پر شفٹ نہیں لی جا سکتی'; END IF;
  ahead := (public.rider_level_info(NEW.rider_id)->>'book_days_ahead')::int;
  IF NEW.shift_date > current_date + ahead THEN RAISE EXCEPTION 'آپ کے لیول پر صرف % دن آگے تک شفٹ بک ہو سکتی ہے', ahead; END IF;
  SELECT count(*) INTO booked FROM rider_shifts WHERE rider_id = NEW.rider_id AND shift_date = NEW.shift_date;
  IF booked >= 3 THEN RAISE EXCEPTION 'ایک دن میں زیادہ سے زیادہ 3 شفٹس'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_guard_rider_shift BEFORE INSERT ON public.rider_shifts FOR EACH ROW EXECUTE FUNCTION public.guard_rider_shift();