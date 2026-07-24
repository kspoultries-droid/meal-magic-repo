
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _code TEXT;
  _tries INT := 0;
BEGIN
  IF NEW.referral_code IS NOT NULL THEN
    RETURN NEW;
  END IF;
  LOOP
    _code := upper(substr(md5(random()::text || NEW.id::text), 1, 6));
    BEGIN
      NEW.referral_code := _code;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      _tries := _tries + 1;
      IF _tries > 5 THEN EXIT; END IF;
    END;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_referral_code_trigger ON public.profiles;
CREATE TRIGGER profiles_referral_code_trigger
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.generate_referral_code();

-- Backfill existing rows
UPDATE public.profiles
SET referral_code = upper(substr(md5(random()::text || id::text), 1, 6))
WHERE referral_code IS NULL;
