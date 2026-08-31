CREATE TABLE public.rider_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  application_id uuid REFERENCES public.partner_applications(id) ON DELETE SET NULL,
  cnic_number text NOT NULL,
  cnic_expiry date,
  cnic_name text,
  cnic_address text,
  declared_name text,
  declared_address text,
  front_url text,
  back_url text,
  selfie_url text,
  face_match boolean NOT NULL DEFAULT false,
  liveness_ok boolean NOT NULL DEFAULT false,
  address_match boolean NOT NULL DEFAULT false,
  expiry_valid boolean NOT NULL DEFAULT false,
  cnic_match boolean NOT NULL DEFAULT false,
  biometric_registered boolean NOT NULL DEFAULT false,
  ai_score numeric NOT NULL DEFAULT 0,
  ai_checks jsonb NOT NULL DEFAULT '{}'::jsonb,
  failure_reason text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.rider_verifications TO authenticated;
GRANT ALL ON public.rider_verifications TO service_role;

ALTER TABLE public.rider_verifications ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX rider_verifications_user_uniq ON public.rider_verifications(user_id);
CREATE UNIQUE INDEX rider_verifications_cnic_uniq
  ON public.rider_verifications(cnic_number)
  WHERE status <> 'rejected';

CREATE POLICY "Riders view own verification"
ON public.rider_verifications FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'));

CREATE POLICY "Riders create own verification"
ON public.rider_verifications FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Riders update own verification"
ON public.rider_verifications FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage verifications"
ON public.rider_verifications FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.protect_rider_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  NEW.status := OLD.status;
  NEW.face_match := OLD.face_match;
  NEW.liveness_ok := OLD.liveness_ok;
  NEW.address_match := OLD.address_match;
  NEW.expiry_valid := OLD.expiry_valid;
  NEW.cnic_match := OLD.cnic_match;
  NEW.ai_score := OLD.ai_score;
  NEW.ai_checks := OLD.ai_checks;
  NEW.cnic_number := OLD.cnic_number;
  NEW.reviewed_by := OLD.reviewed_by;
  NEW.reviewed_at := OLD.reviewed_at;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_rider_verification_upd
BEFORE UPDATE ON public.rider_verifications
FOR EACH ROW EXECUTE FUNCTION public.protect_rider_verification();

CREATE TRIGGER rider_verifications_updated_at
BEFORE UPDATE ON public.rider_verifications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
