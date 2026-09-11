
-- 1) prevent duplicate rider cash journal rows for the same remittance
DELETE FROM public.rider_cash_journal a
USING public.rider_cash_journal b
WHERE a.remittance_id IS NOT NULL AND a.remittance_id = b.remittance_id
  AND a.entry_type = b.entry_type AND a.ctid > b.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS rider_cash_journal_remittance_unique
  ON public.rider_cash_journal (entry_type, remittance_id) WHERE remittance_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.zz_post_remittance_financials()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.status = 'approved' AND COALESCE(OLD.status,'') <> 'approved' THEN
    INSERT INTO public.rider_cash_journal (rider_id, entry_type, remittance_id, amount, note, created_by)
    VALUES (NEW.rider_id, 'remitted', NEW.id, -ROUND(COALESCE(NEW.amount,0),2), 'Remittance approved', auth.uid())
    ON CONFLICT (entry_type, remittance_id) WHERE remittance_id IS NOT NULL DO NOTHING;

    PERFORM public.post_ledger_txn('rider_remittance', 'remittance', NEW.id, jsonb_build_array(
      jsonb_build_object('account','bank_cash','direction','debit','amount', ROUND(COALESCE(NEW.amount,0),2)),
      jsonb_build_object('account','rider_cash_in_hand','party', NEW.rider_id::text, 'direction','credit','amount', ROUND(COALESCE(NEW.amount,0),2))
    ), 'Rider cash remitted');
  END IF;
  RETURN NEW;
END; $function$;

-- 2) refunds must only be applied to the payment once
CREATE OR REPLACE FUNCTION public.zz_post_refund_financials()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _amt numeric(14,2);
BEGIN
  IF NEW.status = 'completed' AND COALESCE(OLD.status,'') <> 'completed'
     AND OLD.completed_at IS NULL AND NOT EXISTS (
       SELECT 1 FROM public.ledger_transactions
       WHERE txn_kind='refund' AND order_kind='refund' AND order_id = NEW.id) THEN
    _amt := ROUND(NEW.amount, 2);
    NEW.completed_at := COALESCE(NEW.completed_at, now());
    PERFORM public.post_ledger_txn('refund', 'refund', NEW.id, jsonb_build_array(
      jsonb_build_object('account','refund_expense','direction','debit','amount', _amt, 'memo', NEW.reason),
      jsonb_build_object('account','customer_refund_payable','party', COALESCE(NEW.customer_id::text,''), 'direction','credit','amount', _amt)
    ), 'Customer refund');

    IF NEW.payment_id IS NOT NULL THEN
      UPDATE public.payments p
        SET amount_refunded = ROUND(COALESCE(p.amount_refunded,0) + _amt, 2),
            status = CASE WHEN ROUND(COALESCE(p.amount_refunded,0) + _amt,2) >= p.amount THEN 'refunded' ELSE 'partially_refunded' END
        WHERE p.id = NEW.payment_id;
    END IF;
  END IF;
  RETURN NEW;
END; $function$;

-- 3) Data API grants (RLS policies already exist and stay authoritative)
GRANT SELECT ON public.ledger_accounts TO authenticated;
GRANT SELECT ON public.ledger_transactions TO authenticated;
GRANT SELECT ON public.ledger_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.refunds TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rider_cash_journal TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.service_quotations TO authenticated;
GRANT ALL ON public.ledger_accounts TO service_role;
GRANT ALL ON public.ledger_transactions TO service_role;
GRANT ALL ON public.ledger_entries TO service_role;
GRANT ALL ON public.payments TO service_role;
GRANT ALL ON public.refunds TO service_role;
GRANT ALL ON public.rider_cash_journal TO service_role;
GRANT ALL ON public.service_quotations TO service_role;
