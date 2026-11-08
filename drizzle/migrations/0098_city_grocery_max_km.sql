ALTER TABLE public.cities ADD COLUMN IF NOT EXISTS grocery_max_km numeric NOT NULL DEFAULT 6;
COMMENT ON COLUMN public.cities.grocery_max_km IS 'Max shop-to-customer km for retail grocery delivery in this city';

DO $mig$
DECLARE d text;
BEGIN
  d := pg_get_functiondef('public.quote_delivery(text,uuid,uuid,double precision,double precision,numeric,numeric)'::regprocedure);
  IF position('grocery_max_km' in d) = 0 THEN
    d := replace(d, '  -- Decide the mode',
'  IF _store_kind = ''retail'' THEN
    DECLARE lim numeric;
    BEGIN
      SELECT grocery_max_km INTO lim FROM public.cities WHERE id = COALESCE(v_store_city, _city_id);
      IF _city_id IS DISTINCT FROM v_store_city THEN RAISE EXCEPTION ''This grocery shop does not deliver to your area''; END IF;
      IF lim IS NOT NULL AND v_km > lim THEN RAISE EXCEPTION ''This grocery shop does not deliver to your area (%.1f km, limit % km)'', v_km, lim; END IF;
    END;
  END IF;
  -- Decide the mode');
    EXECUTE d;
  END IF;
END $mig$;