REVOKE EXECUTE ON FUNCTION public.grocery_recalc_order(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grocery_materialize_items(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grocery_recalc_order(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.grocery_materialize_items(uuid) TO service_role;