GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon;
GRANT SELECT ON public.grocery_products TO anon;
GRANT SELECT ON public.grocery_products TO authenticated;
GRANT SELECT ON public.grocery_stores TO anon;
GRANT SELECT ON public.grocery_stores TO authenticated;