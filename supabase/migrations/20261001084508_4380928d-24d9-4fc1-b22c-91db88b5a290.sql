DO $$ DECLARE d text; BEGIN
  FOREACH d IN ARRAY ARRAY['public.admin_force_assign_rider(text,uuid,uuid)','public.admin_offer_order_to_rider(text,uuid,uuid,numeric)','public.retry_order_dispatch(text,uuid)'] LOOP
    EXECUTE replace(pg_get_functiondef(d::regprocedure), 'public.has_role(auth.uid(), ''admin'') OR', 'public.has_permission(auth.uid(), ''dispatch'') OR');
  END LOOP;
  EXECUTE replace(pg_get_functiondef('public.admin_set_rider_state(uuid,text,text)'::regprocedure), 'has_role(auth.uid(), ''admin'')', 'has_permission(auth.uid(), ''riders'')');
  EXECUTE replace(pg_get_functiondef('public.review_rider_remittance(uuid,boolean,text)'::regprocedure), 'has_role(auth.uid(),''admin'')', 'has_permission(auth.uid(),''finance'')');
  EXECUTE replace(pg_get_functiondef('public.review_rider_remittance(uuid,boolean,text,numeric)'::regprocedure), 'has_role(auth.uid(),''admin'')', 'has_permission(auth.uid(),''finance'')');
  EXECUTE replace(pg_get_functiondef('public.admin_pay_vendor(uuid,numeric,uuid,uuid,date,date,text,text)'::regprocedure), 'has_role(auth.uid(),''admin'')', 'has_permission(auth.uid(),''finance'')');
END $$;

ALTER TABLE public.approval_requests ADD COLUMN IF NOT EXISTS used_at timestamptz;

CREATE OR REPLACE FUNCTION public.enforce_two_person_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _kind text; _ref text; _req uuid;
BEGIN
  IF _uid IS NULL OR NOT public.is_staff(_uid) THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.app_owner WHERE user_id = _uid) THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME = 'payouts' THEN
    _kind := 'payout'; _ref := NEW.vendor_id::text;
  ELSE
    IF COALESCE(NEW.amount,0) <= 2000 THEN RETURN NEW; END IF;
    _kind := 'refund'; _ref := NEW.order_id::text;
  END IF;
  SELECT id INTO _req FROM public.approval_requests
   WHERE kind = _kind AND status = 'approved' AND used_at IS NULL
     AND reference_id = _ref AND amount >= NEW.amount AND decided_by <> _uid
   ORDER BY decided_at LIMIT 1 FOR UPDATE;
  IF _req IS NULL THEN
    RAISE EXCEPTION 'منظوری درکار: پہلے "ٹیم → منظوریاں" میں % کی درخواست دیں (حوالہ %، رقم Rs %) اور کسی دوسرے سے منظور کروائیں', _kind, _ref, NEW.amount;
  END IF;
  UPDATE public.approval_requests SET used_at = now() WHERE id = _req;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enforce_two_person_approval() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS aa_two_person_approval ON public.payouts;
CREATE TRIGGER aa_two_person_approval BEFORE INSERT ON public.payouts FOR EACH ROW EXECUTE FUNCTION public.enforce_two_person_approval();
DROP TRIGGER IF EXISTS aa_two_person_approval ON public.refunds;
CREATE TRIGGER aa_two_person_approval BEFORE INSERT ON public.refunds FOR EACH ROW EXECUTE FUNCTION public.enforce_two_person_approval();

CREATE POLICY "finance manages refunds" ON public.refunds FOR INSERT TO authenticated WITH CHECK (public.has_permission(auth.uid(),'finance'));