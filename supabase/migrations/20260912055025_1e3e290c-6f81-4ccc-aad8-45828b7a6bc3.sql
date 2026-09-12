GRANT EXECUTE ON FUNCTION public.vendor_payable(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rider_cash_due(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resolve_rider_pay(uuid) TO authenticated, service_role;