REVOKE EXECUTE ON FUNCTION public.guard_order_update_fields() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.guard_order_update_fields() FROM anon;
REVOKE EXECUTE ON FUNCTION public.guard_order_update_fields() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.guard_order_update_fields() TO service_role;