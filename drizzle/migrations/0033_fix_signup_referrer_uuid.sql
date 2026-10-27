CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  ref_code text;
  referrer_id uuid;
BEGIN
  ref_code := nullif(trim(NEW.raw_user_meta_data->>'referral_code'), '');
  IF ref_code IS NOT NULL THEN
    SELECT p.id INTO referrer_id
    FROM public.profiles AS p
    WHERE p.referral_code = ref_code;
  END IF;
  INSERT INTO public.profiles (id, full_name, referred_by)
  VALUES (NEW.id, coalesce(NEW.raw_user_meta_data->>'full_name', ''), referrer_id);
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer');
  RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;