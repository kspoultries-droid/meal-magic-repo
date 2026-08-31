REVOKE EXECUTE ON FUNCTION public.protect_payment_account_balance() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_rider_remittance() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_payout_insert() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rider_cash_due(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.vendor_payable(uuid) FROM anon;