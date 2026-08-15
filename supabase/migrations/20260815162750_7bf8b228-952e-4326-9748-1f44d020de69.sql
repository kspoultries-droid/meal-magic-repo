-- Lock down SECURITY DEFINER function execution
REVOKE ALL ON FUNCTION public.approve_partner_application(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_partner_application(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.reject_partner_application(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_partner_application(uuid, text) TO authenticated;

-- Trigger-only functions must not be callable from the API at all
REVOKE ALL ON FUNCTION public.generate_referral_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recalc_restaurant_rating() FROM PUBLIC, anon, authenticated;

-- Tighten partner application inserts: no self-approval / forged review metadata
DROP POLICY IF EXISTS "Anyone can submit application" ON public.partner_applications;
CREATE POLICY "Anyone can submit application"
ON public.partner_applications
FOR INSERT
TO anon, authenticated
WITH CHECK (
  status = 'pending'
  AND reviewed_by IS NULL
  AND reviewed_at IS NULL
  AND admin_notes IS NULL
);