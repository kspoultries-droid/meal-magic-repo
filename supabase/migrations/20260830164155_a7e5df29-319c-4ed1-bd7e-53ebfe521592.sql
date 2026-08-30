REVOKE EXECUTE ON FUNCTION public.review_rider_remittance(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_rider_remittance(uuid, boolean, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.reply_to_review(text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reply_to_review(text, uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.confirm_payout_received(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_payout_received(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.protect_grocery_review_reply() FROM PUBLIC, anon, authenticated;