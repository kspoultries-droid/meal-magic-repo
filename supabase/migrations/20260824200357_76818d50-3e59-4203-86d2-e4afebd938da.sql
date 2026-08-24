-- 1) Reels counters: no anonymous execution
REVOKE EXECUTE ON FUNCTION public.increment_reel_views(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.like_reel(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_reel_views(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.like_reel(uuid) TO authenticated;

-- 2) Helper: is a booking relevant to this mechanic?
CREATE OR REPLACE FUNCTION public.mechanic_can_access_booking(_user_id uuid, _booking_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.service_bookings b
    JOIN public.services s ON s.id = b.service_id
    JOIN public.service_providers p ON p.user_id = _user_id
    WHERE b.id = _booking_id
      AND (
        p.category_id = s.category_id
        OR (p.category_id IS NULL AND p.city_id IS NOT DISTINCT FROM b.city_id)
      )
  )
$$;

REVOKE EXECUTE ON FUNCTION public.mechanic_can_access_booking(uuid, uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.mechanic_can_access_booking(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Mechanics view service bookings" ON public.service_bookings;
CREATE POLICY "Mechanics view assigned service bookings"
ON public.service_bookings FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'mechanic')
  AND public.mechanic_can_access_booking(auth.uid(), id)
);

DROP POLICY IF EXISTS "Mechanics update service bookings" ON public.service_bookings;
CREATE POLICY "Mechanics update assigned service bookings"
ON public.service_bookings FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'mechanic')
  AND public.mechanic_can_access_booking(auth.uid(), id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'mechanic')
  AND public.mechanic_can_access_booking(auth.uid(), id)
);

-- 3) Profiles: mechanics / service managers only see customers of their own bookings
DROP POLICY IF EXISTS "Mechanics view profiles" ON public.profiles;
CREATE POLICY "Mechanics view their booking customers"
ON public.profiles FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'mechanic')
  AND EXISTS (
    SELECT 1 FROM public.service_bookings b
    WHERE b.customer_id = profiles.id
      AND public.mechanic_can_access_booking(auth.uid(), b.id)
  )
);

DROP POLICY IF EXISTS "Service managers view profiles" ON public.profiles;
CREATE POLICY "Service managers view their category customers"
ON public.profiles FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'service_manager')
  AND EXISTS (
    SELECT 1
    FROM public.service_bookings b
    JOIN public.services s ON s.id = b.service_id
    WHERE b.customer_id = profiles.id
      AND public.manages_category(auth.uid(), s.category_id)
  )
);