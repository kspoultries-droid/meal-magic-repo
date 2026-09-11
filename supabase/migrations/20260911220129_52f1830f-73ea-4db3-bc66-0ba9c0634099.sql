CREATE OR REPLACE FUNCTION public.zz_post_order_financials()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _kind text; _total numeric(14,2); _orig numeric(14,2); _fee numeric(14,2); _comm numeric(14,2) := 0;
  _vendor uuid; _rider_pay numeric(14,2) := 0; _method text; _lines jsonb; _pay uuid;
BEGIN
  _kind := CASE TG_TABLE_NAME WHEN 'orders' THEN 'food' ELSE 'grocery_cart' END;
  _method := lower(COALESCE(NEW.payment_method,'cod'));
  _orig := ROUND(COALESCE(NEW.total_amount,0),2);
  IF TG_TABLE_NAME = 'grocery_cart_orders' THEN
    _total := ROUND(COALESCE((to_jsonb(NEW)->>'final_amount')::numeric, NEW.total_amount, 0),2);
  ELSE
    _total := _orig;
  END IF;
  _fee := ROUND(COALESCE(NEW.delivery_fee,0),2);

  IF NEW.status IN ('delivered','completed') AND COALESCE(OLD.status,'') NOT IN ('delivered','completed') THEN
    SELECT commission, vendor_id INTO _comm, _vendor
      FROM public.platform_commissions WHERE order_kind = _kind AND order_id = NEW.id;
    _comm := ROUND(COALESCE(_comm,0),2);
    SELECT ROUND(COALESCE(amount,0),2) INTO _rider_pay
      FROM public.rider_earnings WHERE order_kind = _kind AND order_id = NEW.id;
    _rider_pay := COALESCE(_rider_pay,0);

    _lines := jsonb_build_array(
      jsonb_build_object('account', CASE WHEN _method='cod' THEN 'rider_cash_in_hand' ELSE 'bank_cash' END,
                         'party', COALESCE(NEW.rider_id::text,''), 'direction','debit','amount', _total, 'memo','order collection'),
      jsonb_build_object('account','vendor_payable','party', COALESCE(_vendor::text,''), 'direction','credit',
                         'amount', GREATEST(0, _total - _fee - _comm), 'memo','vendor payable'),
      jsonb_build_object('account','commission_revenue','direction','credit','amount', _comm, 'memo','platform commission'),
      jsonb_build_object('account','delivery_revenue','direction','credit','amount', _fee, 'memo','delivery fee')
    );
    PERFORM public.post_ledger_txn('order_settlement', _kind, NEW.id, _lines, 'Order settled on delivery');

    IF _rider_pay > 0 THEN
      PERFORM public.post_ledger_txn('rider_earning', _kind, NEW.id, jsonb_build_array(
        jsonb_build_object('account','rider_pay_expense','party', COALESCE(NEW.rider_id::text,''), 'direction','debit','amount', _rider_pay),
        jsonb_build_object('account','rider_payable','party', COALESCE(NEW.rider_id::text,''), 'direction','credit','amount', _rider_pay)
      ), 'Rider earning accrued');
    END IF;

    IF _method = 'cod' AND NEW.rider_id IS NOT NULL AND _total > 0 THEN
      INSERT INTO public.rider_cash_journal (rider_id, entry_type, order_kind, order_id, amount, note)
      VALUES (NEW.rider_id, 'collected', _kind, NEW.id, _total, 'COD collected on delivery')
      ON CONFLICT DO NOTHING;
    END IF;

    UPDATE public.payments
      SET status = 'captured', captured_at = COALESCE(captured_at, now()), amount = _total
      WHERE order_kind = _kind AND order_id = NEW.id AND status <> 'captured';

    IF _method <> 'cod' AND _total < _orig THEN
      SELECT id INTO _pay FROM public.payments WHERE order_kind = _kind AND order_id = NEW.id;
      INSERT INTO public.refunds (payment_id, order_kind, order_id, customer_id, amount, refund_type, reason, status, initiated_by)
      SELECT _pay, _kind, NEW.id, NEW.customer_id, ROUND(_orig - _total,2), 'partial', 'Fulfilment adjustment', 'completed', NULL
      WHERE NOT EXISTS (
        SELECT 1 FROM public.refunds r
        WHERE r.order_kind = _kind AND r.order_id = NEW.id AND r.reason = 'Fulfilment adjustment');
    END IF;
  END IF;

  IF NEW.status = 'cancelled' AND COALESCE(OLD.status,'') <> 'cancelled' THEN
    UPDATE public.payments
      SET status = CASE WHEN status = 'captured' THEN 'refunded' ELSE 'cancelled' END
      WHERE order_kind = _kind AND order_id = NEW.id;
  END IF;

  RETURN NEW;
END; $function$;