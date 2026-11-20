-- PENDING — NOT EXECUTED. Apply only via lov_database--migration after tool repair.
-- Purpose: customers cannot set profiles.phone_verified themselves; changing phone resets it.
-- Only server-side code (real OTP verification, service role) may set phone_verified = true.
-- Rollback: DROP TRIGGER guard_phone_verified_trigger ON public.profiles; DROP FUNCTION public.guard_phone_verified();
CREATE OR REPLACE FUNCTION public.guard_phone_verified()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated','anon') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.phone_verified := false;
    ELSE
      IF NEW.phone_verified IS DISTINCT FROM OLD.phone_verified THEN
        NEW.phone_verified := OLD.phone_verified;
      END IF;
      IF NEW.phone IS DISTINCT FROM OLD.phone THEN
        NEW.phone_verified := false;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_phone_verified_trigger ON public.profiles;
CREATE TRIGGER guard_phone_verified_trigger BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_phone_verified();
