DO $mig$
DECLARE d text;
BEGIN
  d := pg_get_functiondef('public.quote_delivery(text,uuid,uuid,double precision,double precision,numeric,numeric)'::regprocedure);
  d := replace(d, '(%.1f km, limit % km)'', v_km, lim', '(% km, limit % km)'', round(v_km,1), lim');
  EXECUTE d;
END $mig$;