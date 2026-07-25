
-- 1. Fix approve_partner_application: riders table PK is `id` (auth.users), not user_id;
-- and it has no full_name/phone columns, and availability field is `is_available` not `is_online`.
CREATE OR REPLACE FUNCTION public.approve_partner_application(_application_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _app public.partner_applications%ROWTYPE;
  _role app_role;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can approve applications';
  END IF;

  SELECT * INTO _app FROM public.partner_applications WHERE id = _application_id;
  IF _app.id IS NULL THEN RAISE EXCEPTION 'Application not found'; END IF;
  IF _app.status = 'approved' THEN RAISE EXCEPTION 'Already approved'; END IF;
  IF _app.user_id IS NULL THEN RAISE EXCEPTION 'Applicant must have a registered account. Ask them to sign up first.'; END IF;

  _role := CASE _app.applicant_type
    WHEN 'restaurant' THEN 'restaurant_owner'::app_role
    WHEN 'grocery' THEN 'restaurant_owner'::app_role
    WHEN 'wholesale' THEN 'restaurant_owner'::app_role
    WHEN 'service_provider' THEN 'mechanic'::app_role
    WHEN 'rider' THEN 'rider'::app_role
  END;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_app.user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF _app.applicant_type = 'rider' THEN
    INSERT INTO public.riders (id, city_id, is_available)
    VALUES (_app.user_id, _app.city_id, false)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  UPDATE public.partner_applications
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = _application_id;
END;
$function$;

-- 2. Saved addresses table
CREATE TABLE IF NOT EXISTS public.user_addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Home',
  address TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_addresses TO authenticated;
GRANT ALL ON public.user_addresses TO service_role;

ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own addresses"
  ON public.user_addresses FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_addresses_user ON public.user_addresses(user_id);

CREATE TRIGGER update_user_addresses_updated_at
  BEFORE UPDATE ON public.user_addresses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
