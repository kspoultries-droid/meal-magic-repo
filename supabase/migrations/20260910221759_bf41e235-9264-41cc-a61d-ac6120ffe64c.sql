-- 1) Restrict grocery review reads to participants, store owners and staff
DROP POLICY IF EXISTS "Authenticated users read grocery reviews" ON public.grocery_reviews;

CREATE POLICY "Participants and staff read grocery reviews"
ON public.grocery_reviews
FOR SELECT
TO authenticated
USING (
  customer_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.grocery_stores s
    WHERE s.id = grocery_reviews.store_id AND s.owner_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'support'::app_role)
);

-- Public-facing review content without exposing customer identity
CREATE OR REPLACE VIEW public.grocery_reviews_public
WITH (security_barrier = true) AS
SELECT id, store_id, rating, comment, reply, replied_at, created_at, photo_urls, video_url
FROM public.grocery_reviews;

GRANT SELECT ON public.grocery_reviews_public TO anon, authenticated;

-- 2) SECURITY DEFINER functions must not be callable by signed-out visitors
REVOKE EXECUTE ON FUNCTION public.quote_delivery(text, uuid, uuid, double precision, double precision, numeric, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.quote_delivery(text, uuid, uuid, double precision, double precision, numeric, numeric) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.list_public_service_providers(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_public_service_providers(uuid) TO authenticated, service_role;

-- Keep the public provider directory available to signed-out visitors without the definer function
REVOKE SELECT ON public.service_providers FROM anon;
GRANT SELECT (id, name, category_id, city_id, latitude, longitude, address, rating, total_reviews, is_available, is_active, bio, image_url)
ON public.service_providers TO anon;

DROP POLICY IF EXISTS "Public can view active providers" ON public.service_providers;
CREATE POLICY "Public can view active providers"
ON public.service_providers
FOR SELECT
TO anon
USING (is_active = true);