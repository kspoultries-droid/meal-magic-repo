-- Partner applications table
CREATE TYPE public.partner_type AS ENUM ('restaurant','grocery','wholesale','service_provider','rider');
CREATE TYPE public.application_status AS ENUM ('pending','approved','rejected');

CREATE TABLE public.partner_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  applicant_type public.partner_type NOT NULL,
  business_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp TEXT,
  cnic TEXT,
  email TEXT,
  city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL,
  address TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  category TEXT,
  cnic_image_url TEXT,
  shop_image_url TEXT,
  extra JSONB DEFAULT '{}'::jsonb,
  status public.application_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_applications TO authenticated;
GRANT INSERT ON public.partner_applications TO anon;
GRANT ALL ON public.partner_applications TO service_role;

ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can submit
CREATE POLICY "Anyone can submit application"
  ON public.partner_applications FOR INSERT
  WITH CHECK (true);

-- Users see their own applications
CREATE POLICY "Users view own applications"
  ON public.partner_applications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins see all applications
CREATE POLICY "Admins view all applications"
  ON public.partner_applications FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'));

-- Admins update applications
CREATE POLICY "Admins update applications"
  ON public.partner_applications FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins delete applications
CREATE POLICY "Admins delete applications"
  ON public.partner_applications FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER partner_applications_updated_at
BEFORE UPDATE ON public.partner_applications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_partner_apps_status ON public.partner_applications(status);
CREATE INDEX idx_partner_apps_user ON public.partner_applications(user_id);

-- Storage policies for partner-documents bucket (private)
CREATE POLICY "Users upload own partner docs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'partner-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anon can upload partner docs"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'partner-documents' AND (storage.foldername(name))[1] = 'public-submissions');

CREATE POLICY "Users read own partner docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'partner-documents' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support')));

-- Approve function: promotes applicant and assigns role
CREATE OR REPLACE FUNCTION public.approve_partner_application(_application_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Map applicant_type to app_role
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

  -- Auto-create rider row for riders
  IF _app.applicant_type = 'rider' THEN
    INSERT INTO public.riders (user_id, full_name, phone, city_id, is_online)
    VALUES (_app.user_id, _app.owner_name, _app.phone, _app.city_id, false)
    ON CONFLICT DO NOTHING;
  END IF;

  UPDATE public.partner_applications
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = _application_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_partner_application(_application_id UUID, _reason TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can reject applications';
  END IF;

  UPDATE public.partner_applications
  SET status = 'rejected', admin_notes = _reason, reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = _application_id;
END;
$$;
