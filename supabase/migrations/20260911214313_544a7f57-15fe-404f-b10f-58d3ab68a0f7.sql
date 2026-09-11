
CREATE OR REPLACE FUNCTION public.zz_post_remittance_financials()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _short numeric(14,2) := 0; _over numeric(14,2) := 0; _exp numeric(14,2);
BEGIN
  IF NEW.status = 'approved' AND COALESCE(OLD.status,'') <> 'approved' THEN
    INSERT INTO public.rider_cash_journal (rider_id, entry_type, remittance_id, amount, note, created_by)
    VALUES (NEW.rider_id, 'remitted', NEW.id, -ROUND(COALESCE(NEW.amount,0),2), 'Remittance approved', auth.uid())
    ON CONFLICT (entry_type, remittance_id) WHERE remittance_id IS NOT NULL DO NOTHING;

    PERFORM public.post_ledger_txn('rider_remittance', 'remittance', NEW.id, jsonb_build_array(
      jsonb_build_object('account','bank_cash','direction','debit','amount', ROUND(COALESCE(NEW.amount,0),2)),
      jsonb_build_object('account','rider_cash_in_hand','party', NEW.rider_id::text, 'direction','credit','amount', ROUND(COALESCE(NEW.amount,0),2))
    ), 'Rider cash remitted');

    _exp := NEW.expected_amount;
    IF _exp IS NOT NULL THEN
      _short := GREATEST(0, ROUND(_exp - COALESCE(NEW.amount,0), 2));
      _over  := GREATEST(0, ROUND(COALESCE(NEW.amount,0) - _exp, 2));

      UPDATE public.rider_remittances
         SET shortage_amount = _short, overage_amount = _over
       WHERE id = NEW.id
         AND (COALESCE(shortage_amount,-1) IS DISTINCT FROM _short OR COALESCE(overage_amount,-1) IS DISTINCT FROM _over);

      IF _short > 0 THEN
        PERFORM public.post_ledger_txn('cash_shortage', 'remittance', NEW.id, jsonb_build_array(
          jsonb_build_object('account','cash_shortage','party', NEW.rider_id::text,'direction','debit','amount', _short, 'memo','Rider cash shortage receivable'),
          jsonb_build_object('account','rider_cash_in_hand','party', NEW.rider_id::text,'direction','credit','amount', _short)
        ), 'COD shortage recorded');
      ELSIF _over > 0 THEN
        PERFORM public.post_ledger_txn('cash_overage', 'remittance', NEW.id, jsonb_build_array(
          jsonb_build_object('account','rider_cash_in_hand','party', NEW.rider_id::text,'direction','debit','amount', _over),
          jsonb_build_object('account','cash_shortage','party', NEW.rider_id::text,'direction','credit','amount', _over, 'memo','Rider cash overage')
        ), 'COD overage recorded');
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END; $function$;
