CREATE OR REPLACE FUNCTION public.register_device_token(_token text, _platform text DEFAULT 'web')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _token IS NULL OR length(_token) < 20 OR length(_token) > 4096 THEN RAISE EXCEPTION 'invalid token'; END IF;
  IF _platform NOT IN ('web','android','ios') THEN RAISE EXCEPTION 'invalid platform'; END IF;
  INSERT INTO public.device_tokens(user_id, token, platform, updated_at)
  VALUES (auth.uid(), _token, _platform, now())
  ON CONFLICT (token) DO UPDATE SET user_id = auth.uid(), platform = EXCLUDED.platform, updated_at = now();
END $$;
REVOKE ALL ON FUNCTION public.register_device_token(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_device_token(text, text) TO authenticated;