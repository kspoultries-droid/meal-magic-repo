-- Restore execute access only for functions intentionally called by the client.
-- Trigger, guard, protection, and dispatch internals remain revoked.

GRANT EXECUTE ON FUNCTION public.get_rider_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_rider_info(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_customer_contact(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_voucher(text, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_voucher_to_order(text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_grocery_cart_order(uuid, uuid, text, text, text, jsonb, text, text, boolean, double precision, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_order(uuid, uuid, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_order(uuid, uuid, text, text, text, jsonb, text, text, boolean, double precision, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_wallet_topup(numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_service_providers(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_service_booking(uuid, text, date, time without time zone, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_rider_remittance(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pay_rider(uuid, date, date, numeric, numeric, numeric, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_pay_vendor(uuid, numeric, uuid, uuid, date, date, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_reel_views(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.like_reel(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_partner_application(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_partner_application(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reply_to_review(text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_delivery_offer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_delivery_offer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_deposit_accounts() TO authenticated;