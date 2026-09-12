GRANT EXECUTE ON FUNCTION public.vendor_payable(uuid) TO supabase_read_only_user;
GRANT EXECUTE ON FUNCTION public.rider_cash_due(uuid) TO supabase_read_only_user;
GRANT EXECUTE ON FUNCTION public.resolve_rider_pay(uuid) TO supabase_read_only_user;