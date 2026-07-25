CREATE OR REPLACE FUNCTION public.approve_partner_application(_application_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _app public.partner_applications%ROWTYPE;
  _role public.app_role;
  _service_category_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can approve applications';
  END IF;

  SELECT * INTO _app
  FROM public.partner_applications
  WHERE id = _application_id;

  IF _app.id IS NULL THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF _app.status = 'approved' THEN
    RAISE EXCEPTION 'Already approved';
  END IF;

  IF _app.user_id IS NULL THEN
    RAISE EXCEPTION 'Applicant must have a registered account. Ask them to sign up first.';
  END IF;

  _role := CASE _app.applicant_type
    WHEN 'restaurant' THEN 'restaurant_owner'::public.app_role
    WHEN 'grocery' THEN 'restaurant_owner'::public.app_role
    WHEN 'wholesale' THEN 'restaurant_owner'::public.app_role
    WHEN 'service_provider' THEN 'mechanic'::public.app_role
    WHEN 'rider' THEN 'rider'::public.app_role
  END;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_app.user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF _app.applicant_type = 'rider' THEN
    INSERT INTO public.riders (id, city_id, is_available)
    VALUES (_app.user_id, _app.city_id, false)
    ON CONFLICT (id) DO UPDATE
      SET city_id = COALESCE(EXCLUDED.city_id, public.riders.city_id),
          is_available = COALESCE(public.riders.is_available, false),
          updated_at = now();
  ELSIF _app.applicant_type = 'restaurant' THEN
    IF _app.city_id IS NULL THEN
      RAISE EXCEPTION 'City is required before approving a restaurant application';
    END IF;

    INSERT INTO public.restaurants (
      owner_id, name, description, city_id, cuisines, is_active
    ) VALUES (
      _app.user_id,
      _app.business_name,
      COALESCE(NULLIF(_app.address, ''), 'New partner restaurant'),
      _app.city_id,
      ARRAY[COALESCE(NULLIF(_app.category, ''), 'General')],
      true
    )
    ON CONFLICT DO NOTHING;
  ELSIF _app.applicant_type IN ('grocery', 'wholesale') THEN
    INSERT INTO public.grocery_stores (
      owner_id, name, category, city_id, store_type, is_active, subscription_status, delivery_time
    ) VALUES (
      _app.user_id,
      _app.business_name,
      COALESCE(NULLIF(_app.category, ''), CASE WHEN _app.applicant_type = 'wholesale' THEN 'Wholesale' ELSE 'General' END),
      _app.city_id,
      CASE WHEN _app.applicant_type = 'wholesale' THEN 'wholesale' ELSE 'retail' END,
      true,
      'active',
      '20-30 min'
    )
    ON CONFLICT DO NOTHING;
  ELSIF _app.applicant_type = 'service_provider' THEN
    IF _app.category IS NOT NULL AND trim(_app.category) <> '' THEN
      SELECT id INTO _service_category_id
      FROM public.service_categories
      WHERE lower(name) = lower(trim(_app.category))
      LIMIT 1;
    END IF;

    INSERT INTO public.service_providers (
      user_id, name, phone, category_id, city_id, address, latitude, longitude, is_available, is_active, bio
    ) VALUES (
      _app.user_id,
      _app.business_name,
      _app.phone,
      _service_category_id,
      _app.city_id,
      _app.address,
      _app.location_lat,
      _app.location_lng,
      true,
      true,
      COALESCE(NULLIF(_app.category, ''), 'New service provider')
    )
    ON CONFLICT DO NOTHING;
  END IF;

  UPDATE public.partner_applications
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
  WHERE id = _application_id;
END;
$function$;