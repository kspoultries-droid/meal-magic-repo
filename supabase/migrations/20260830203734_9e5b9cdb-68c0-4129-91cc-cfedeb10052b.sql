REVOKE EXECUTE ON FUNCTION public.commission_on_food_order() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.commission_on_grocery_order() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.commission_on_service_booking() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.resolve_commission_rate(uuid, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.record_commission(text, uuid, uuid, uuid, text, numeric, numeric, text) FROM anon, authenticated, public;