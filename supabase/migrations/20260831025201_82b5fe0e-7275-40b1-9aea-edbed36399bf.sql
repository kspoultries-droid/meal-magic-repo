DROP VIEW IF EXISTS public.service_providers_public;

CREATE OR REPLACE FUNCTION public.list_public_service_providers(_category_id uuid DEFAULT NULL)
RETURNS TABLE(
  id uuid, name text, category_id uuid, category_name text, city_id uuid,
  latitude double precision, longitude double precision, address text,
  rating numeric, total_reviews integer, is_available boolean, bio text, image_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sp.id, sp.name, sp.category_id, sc.name, sp.city_id,
         sp.latitude, sp.longitude, sp.address,
         sp.rating, sp.total_reviews, sp.is_available, sp.bio, sp.image_url
  FROM public.service_providers sp
  LEFT JOIN public.service_categories sc ON sc.id = sp.category_id
  WHERE sp.is_active = true
    AND (_category_id IS NULL OR sp.category_id = _category_id)
  ORDER BY sp.rating DESC NULLS LAST
$$;

REVOKE ALL ON FUNCTION public.list_public_service_providers(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_service_providers(uuid) TO anon, authenticated;