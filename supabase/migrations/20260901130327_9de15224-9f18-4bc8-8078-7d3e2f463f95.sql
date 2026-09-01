-- 1. payment_accounts: restrict sensitive bank details to admins/support
DROP POLICY IF EXISTS "Authenticated can view active accounts" ON public.payment_accounts;
CREATE POLICY "Staff can view payment accounts"
ON public.payment_accounts FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'support'::app_role));

-- riders need to pick a deposit account: expose only non-sensitive label/method via function
CREATE OR REPLACE FUNCTION public.list_deposit_accounts()
RETURNS TABLE(id uuid, label text, method text, bank_name text, account_title text, account_number text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.label, a.method, a.bank_name, a.account_title, a.account_number
  FROM public.payment_accounts a
  WHERE a.is_active = true
    AND (has_role(auth.uid(), 'rider'::app_role)
         OR has_role(auth.uid(), 'admin'::app_role)
         OR has_role(auth.uid(), 'support'::app_role));
$$;
REVOKE ALL ON FUNCTION public.list_deposit_accounts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_deposit_accounts() TO authenticated;

-- 2. rider_reviews: only involved parties and staff can read raw rows
DROP POLICY IF EXISTS "Anyone signed in can read rider reviews" ON public.rider_reviews;
CREATE POLICY "Involved parties and staff read rider reviews"
ON public.rider_reviews FOR SELECT TO authenticated
USING (
  auth.uid() = customer_id
  OR auth.uid() = rider_id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'support'::app_role)
);

-- 3. revoke anon EXECUTE on SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.admin_pay_vendor(uuid, numeric, uuid, uuid, date, date, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.pay_rider(uuid, date, date, numeric, numeric, numeric, uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.vendor_payable(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rider_cash_due(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_commission(text, uuid, uuid, uuid, text, numeric, numeric, text, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_rider_earning(text, uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.resolve_rider_pay(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_access_order_chat(uuid, text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.list_public_service_providers(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.protect_payment_account_balance() FROM anon;
REVOKE EXECUTE ON FUNCTION public.guard_rider_remittance() FROM anon;
REVOKE EXECUTE ON FUNCTION public.guard_payout_insert() FROM anon;
REVOKE EXECUTE ON FUNCTION public.apply_delivery_fee_payer() FROM anon;
REVOKE EXECUTE ON FUNCTION public.protect_rider_verification() FROM anon;
REVOKE EXECUTE ON FUNCTION public.protect_order_message() FROM anon;