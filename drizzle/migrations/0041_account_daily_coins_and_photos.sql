CREATE TABLE public.daily_coin_visits (user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, visit_date date NOT NULL, coins integer NOT NULL DEFAULT 1 CHECK (coins = 1), PRIMARY KEY(user_id,visit_date));
GRANT SELECT ON public.daily_coin_visits TO authenticated;
GRANT ALL ON public.daily_coin_visits TO service_role;
ALTER TABLE public.daily_coin_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own daily coins" ON public.daily_coin_visits FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE FUNCTION public.claim_daily_coin() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); today date := (now() AT TIME ZONE 'Asia/Karachi')::date; added integer; balance bigint;
BEGIN
IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
INSERT INTO public.daily_coin_visits(user_id,visit_date) VALUES(uid,today) ON CONFLICT DO NOTHING;
GET DIAGNOSTICS added = ROW_COUNT;
SELECT coalesce(sum(coins),0) INTO balance FROM public.daily_coin_visits WHERE user_id=uid;
RETURN jsonb_build_object('balance',balance,'claimed',added=1,'date',today);
END; $$;
REVOKE ALL ON FUNCTION public.claim_daily_coin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_daily_coin() TO authenticated;
CREATE POLICY "Upload own profile photo" ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='profile-photos' AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY "Read own profile photo" ON storage.objects FOR SELECT TO authenticated USING(bucket_id='profile-photos' AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY "Delete own profile photo" ON storage.objects FOR DELETE TO authenticated USING(bucket_id='profile-photos' AND (storage.foldername(name))[1]=auth.uid()::text);