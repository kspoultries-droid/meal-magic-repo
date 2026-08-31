-- 1. commission_rules: restrict reads to admins only
DROP POLICY IF EXISTS "commission_rules_read" ON public.commission_rules;
CREATE POLICY "commission_rules_admin_read" ON public.commission_rules
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'support'::app_role));

-- 2. service_providers: remove broad phone-exposing read policy, expose a phone-free public view
DROP POLICY IF EXISTS "Authenticated users view active providers" ON public.service_providers;

CREATE OR REPLACE VIEW public.service_providers_public
WITH (security_invoker = off) AS
SELECT id, user_id, name, category_id, city_id, latitude, longitude, address,
       rating, total_reviews, is_available, is_active, bio, image_url, created_at, updated_at
FROM public.service_providers
WHERE is_active = true;

GRANT SELECT ON public.service_providers_public TO anon, authenticated;

-- contact only for customers with a booking with this provider (or admin/support)
CREATE OR REPLACE FUNCTION public.get_service_provider_contact(_provider_id uuid)
RETURNS TABLE(provider_name text, provider_phone text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sp.name, sp.phone
  FROM public.service_providers sp
  WHERE sp.id = _provider_id
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'support'::app_role)
      OR sp.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.service_bookings b
        WHERE b.provider_id = sp.id
          AND b.customer_id = auth.uid()
          AND COALESCE(b.status, 'pending') NOT IN ('cancelled')
      )
    )
$$;

REVOKE ALL ON FUNCTION public.get_service_provider_contact(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_service_provider_contact(uuid) TO authenticated;