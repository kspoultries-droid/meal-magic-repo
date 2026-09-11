
-- grocery: dispatch only once the store is packed & ready (food unchanged)
CREATE OR REPLACE FUNCTION public.after_order_status_dispatch()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _kind text; _allowed text[];
BEGIN
  _kind := TG_ARGV[0];
  _allowed := CASE WHEN _kind = 'grocery_cart'
                   THEN ARRAY['ready_for_pickup','ready']
                   ELSE ARRAY['confirmed','preparing','ready'] END;
  IF NEW.rider_id IS NULL
     AND NEW.status = ANY(_allowed)
     AND NEW.dispatch_state IN ('none','searching')
     AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    BEGIN
      PERFORM dispatch_next_rider(_kind, NEW.id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'dispatch_next_rider failed for % %: %', _kind, NEW.id, SQLERRM;
    END;
  END IF;
  RETURN NULL;
END; $function$;

-- avoid a duplicate dispatch path
DROP TRIGGER IF EXISTS trg_grocery_ready_dispatch ON public.grocery_cart_orders;
DROP FUNCTION IF EXISTS public.after_grocery_ready_dispatch();

-- admin can record the expected COD cash when approving a remittance
CREATE OR REPLACE FUNCTION public.review_rider_remittance(
  _id uuid, _approve boolean, _note text DEFAULT NULL, _expected numeric DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _r public.rider_remittances%ROWTYPE; _bal numeric; _label text;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only admins can review remittances';
  END IF;
  SELECT * INTO _r FROM public.rider_remittances WHERE id = _id FOR UPDATE;
  IF _r.id IS NULL THEN RAISE EXCEPTION 'Remittance not found'; END IF;
  IF _r.status <> 'pending' THEN RAISE EXCEPTION 'Already reviewed'; END IF;
  IF _expected IS NOT NULL AND _expected < 0 THEN RAISE EXCEPTION 'Invalid expected amount'; END IF;

  UPDATE public.rider_remittances
    SET status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
        admin_note = _note, reviewed_by = auth.uid(), reviewed_at = now(),
        expected_amount = COALESCE(_expected, expected_amount)
    WHERE id = _id;

  IF _approve THEN
    UPDATE public.riders SET wallet_balance = COALESCE(wallet_balance,0) - _r.amount, updated_at = now()
      WHERE id = _r.rider_id;
    IF _r.account_id IS NOT NULL THEN
      PERFORM set_config('app.bypass_ledger_guard','on', true);
      UPDATE public.payment_accounts SET balance = balance + _r.amount, updated_at = now()
        WHERE id = _r.account_id RETURNING balance INTO _bal;
      SELECT full_name INTO _label FROM public.profiles WHERE id = _r.rider_id;
      INSERT INTO public.bank_ledger (account_id, direction, amount, balance_after, source_type, source_id,
        counterparty_id, counterparty_label, reference_no, note, created_by)
      VALUES (_r.account_id, 'in', _r.amount, _bal, 'rider_remittance', _r.id,
        _r.rider_id, COALESCE(_label,'رائیڈر'), _r.reference_no, _r.method, auth.uid());
    END IF;
  END IF;
END; $function$;

REVOKE ALL ON FUNCTION public.review_rider_remittance(uuid,boolean,text,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_rider_remittance(uuid,boolean,text,numeric) TO authenticated, service_role;
