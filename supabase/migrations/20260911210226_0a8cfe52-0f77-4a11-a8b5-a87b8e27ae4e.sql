
-- ============ 1. CHART OF ACCOUNTS + DOUBLE ENTRY LEDGER ============
CREATE TABLE IF NOT EXISTS public.ledger_accounts (
  code text PRIMARY KEY,
  name text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('asset','liability','equity','revenue','expense')),
  party_type text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ledger_accounts TO authenticated;
GRANT ALL ON public.ledger_accounts TO service_role;
ALTER TABLE public.ledger_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read chart of accounts" ON public.ledger_accounts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

INSERT INTO public.ledger_accounts (code, name, account_type, party_type) VALUES
  ('rider_cash_in_hand','Cash held by rider','asset','rider'),
  ('bank_cash','Company bank / wallet accounts','asset',NULL),
  ('vendor_payable','Payable to vendors','liability','vendor'),
  ('rider_payable','Payable to riders','liability','rider'),
  ('customer_refund_payable','Refunds payable to customers','liability','customer'),
  ('commission_revenue','Platform commission revenue','revenue',NULL),
  ('delivery_revenue','Delivery fee revenue','revenue',NULL),
  ('rider_pay_expense','Rider payout expense','expense','rider'),
  ('discount_expense','Discounts and vouchers','expense',NULL),
  ('refund_expense','Refunds granted','expense',NULL),
  ('cash_shortage','Rider cash shortage / overage','expense','rider'),
  ('tax_withheld','Tax / withholding payable','liability',NULL)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.ledger_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  txn_kind text NOT NULL,
  order_kind text,
  order_id uuid,
  currency char(3) NOT NULL DEFAULT 'PKR',
  description text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ledger_txn_order_kind_unique
  ON public.ledger_transactions (txn_kind, order_kind, order_id)
  WHERE order_id IS NOT NULL;
GRANT SELECT ON public.ledger_transactions TO authenticated;
GRANT ALL ON public.ledger_transactions TO service_role;
ALTER TABLE public.ledger_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read ledger txns" ON public.ledger_transactions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  txn_id uuid NOT NULL REFERENCES public.ledger_transactions(id) ON DELETE CASCADE,
  account_code text NOT NULL REFERENCES public.ledger_accounts(code),
  party_id uuid,
  direction text NOT NULL CHECK (direction IN ('debit','credit')),
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  currency char(3) NOT NULL DEFAULT 'PKR',
  memo text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_txn ON public.ledger_entries (txn_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_account_party ON public.ledger_entries (account_code, party_id, created_at DESC);
GRANT SELECT ON public.ledger_entries TO authenticated;
GRANT ALL ON public.ledger_entries TO service_role;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read ledger entries" ON public.ledger_entries
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "party reads own ledger entries" ON public.ledger_entries
  FOR SELECT TO authenticated USING (party_id = auth.uid());

-- balanced posting helper: TOTAL DEBITS = TOTAL CREDITS enforced here
CREATE OR REPLACE FUNCTION public.post_ledger_txn(
  _txn_kind text, _order_kind text, _order_id uuid, _lines jsonb,
  _description text DEFAULT NULL, _currency char(3) DEFAULT 'PKR'
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _txn uuid; _dr numeric(14,2) := 0; _cr numeric(14,2) := 0; _l jsonb;
BEGIN
  IF _lines IS NULL OR jsonb_array_length(_lines) = 0 THEN RETURN NULL; END IF;
  FOR _l IN SELECT * FROM jsonb_array_elements(_lines) LOOP
    IF (_l->>'direction') = 'debit'
      THEN _dr := _dr + ROUND(COALESCE((_l->>'amount')::numeric,0), 2);
      ELSE _cr := _cr + ROUND(COALESCE((_l->>'amount')::numeric,0), 2);
    END IF;
  END LOOP;
  IF _dr <> _cr THEN
    RAISE EXCEPTION 'Unbalanced ledger transaction: debits % <> credits %', _dr, _cr;
  END IF;
  IF _dr = 0 THEN RETURN NULL; END IF;

  INSERT INTO public.ledger_transactions (txn_kind, order_kind, order_id, currency, description, created_by)
  VALUES (_txn_kind, _order_kind, _order_id, _currency, _description, auth.uid())
  ON CONFLICT DO NOTHING
  RETURNING id INTO _txn;
  IF _txn IS NULL THEN RETURN NULL; END IF;  -- already posted (idempotent)

  INSERT INTO public.ledger_entries (txn_id, account_code, party_id, direction, amount, currency, memo)
  SELECT _txn, l->>'account', NULLIF(l->>'party','')::uuid, l->>'direction',
         ROUND((l->>'amount')::numeric, 2), _currency, l->>'memo'
  FROM jsonb_array_elements(_lines) l
  WHERE ROUND(COALESCE((l->>'amount')::numeric,0),2) > 0;

  RETURN _txn;
END; $$;
REVOKE ALL ON FUNCTION public.post_ledger_txn(text,text,uuid,jsonb,text,char) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.post_ledger_txn(text,text,uuid,jsonb,text,char) TO service_role;

-- ============ 2. PROVIDER-NEUTRAL PAYMENTS ============
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_kind text NOT NULL CHECK (order_kind IN ('food','grocery_cart','grocery_list','service')),
  order_id uuid NOT NULL,
  customer_id uuid,
  method text NOT NULL DEFAULT 'cod' CHECK (method IN ('cod','bank_transfer','card','easypaisa','jazzcash','raast','wallet','other')),
  provider text,
  provider_reference text,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  amount_refunded numeric(14,2) NOT NULL DEFAULT 0,
  currency char(3) NOT NULL DEFAULT 'PKR',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','authorized','captured','failed','cancelled','refunded','partially_refunded')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  captured_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS payments_order_unique ON public.payments (order_kind, order_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON public.payments (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments (status, created_at DESC);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customer reads own payments" ON public.payments
  FOR SELECT TO authenticated USING (customer_id = auth.uid());
CREATE POLICY "admin support read payments" ON public.payments
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'support'));
CREATE POLICY "admin manages payments" ON public.payments
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 3. REFUNDS ============
CREATE TABLE IF NOT EXISTS public.refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  order_kind text NOT NULL,
  order_id uuid NOT NULL,
  customer_id uuid,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  currency char(3) NOT NULL DEFAULT 'PKR',
  refund_type text NOT NULL DEFAULT 'partial' CHECK (refund_type IN ('full','partial')),
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','completed','failed')),
  provider_reference text,
  initiated_by uuid,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_refunds_order ON public.refunds (order_kind, order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_customer ON public.refunds (customer_id, created_at DESC);
GRANT SELECT ON public.refunds TO authenticated;
GRANT ALL ON public.refunds TO service_role;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customer reads own refunds" ON public.refunds
  FOR SELECT TO authenticated USING (customer_id = auth.uid());
CREATE POLICY "admin support read refunds" ON public.refunds
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'support'));
CREATE POLICY "admin manages refunds" ON public.refunds
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER refunds_updated_at BEFORE UPDATE ON public.refunds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 4. RIDER COD CASH JOURNAL ============
CREATE TABLE IF NOT EXISTS public.rider_cash_journal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id uuid NOT NULL,
  entry_type text NOT NULL CHECK (entry_type IN ('collected','remitted','adjustment','shortage','overage','write_off')),
  order_kind text,
  order_id uuid,
  remittance_id uuid REFERENCES public.rider_remittances(id) ON DELETE SET NULL,
  amount numeric(14,2) NOT NULL,          -- +ve increases rider cash held, -ve decreases
  currency char(3) NOT NULL DEFAULT 'PKR',
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS rider_cash_journal_order_unique
  ON public.rider_cash_journal (entry_type, order_kind, order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rider_cash_journal_rider ON public.rider_cash_journal (rider_id, created_at DESC);
GRANT SELECT ON public.rider_cash_journal TO authenticated;
GRANT ALL ON public.rider_cash_journal TO service_role;
ALTER TABLE public.rider_cash_journal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rider reads own cash journal" ON public.rider_cash_journal
  FOR SELECT TO authenticated USING (rider_id = auth.uid());
CREATE POLICY "admin reads cash journal" ON public.rider_cash_journal
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'support'));
CREATE POLICY "admin manages cash journal" ON public.rider_cash_journal
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.rider_cash_outstanding(_rider uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT GREATEST(0, COALESCE((SELECT SUM(amount) FROM public.rider_cash_journal WHERE rider_id = _rider), 0));
$$;
GRANT EXECUTE ON FUNCTION public.rider_cash_outstanding(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.rider_cash_limit()
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(NULLIF((SELECT value FROM public.app_settings WHERE key='rider_cash_limit'),'')::numeric, 20000);
$$;
GRANT EXECUTE ON FUNCTION public.rider_cash_limit() TO authenticated, service_role;

-- ============ 5. SETTLEMENT BREAKDOWN ON PAYOUTS (additive) ============
ALTER TABLE public.payouts
  ADD COLUMN IF NOT EXISTS gross_sales numeric(14,2),
  ADD COLUMN IF NOT EXISTS commission_total numeric(14,2),
  ADD COLUMN IF NOT EXISTS discounts_total numeric(14,2),
  ADD COLUMN IF NOT EXISTS refunds_total numeric(14,2),
  ADD COLUMN IF NOT EXISTS adjustments_total numeric(14,2),
  ADD COLUMN IF NOT EXISTS tax_withheld numeric(14,2),
  ADD COLUMN IF NOT EXISTS currency char(3) NOT NULL DEFAULT 'PKR';

ALTER TABLE public.rider_remittances
  ADD COLUMN IF NOT EXISTS expected_amount numeric(14,2),
  ADD COLUMN IF NOT EXISTS shortage_amount numeric(14,2),
  ADD COLUMN IF NOT EXISTS overage_amount numeric(14,2),
  ADD COLUMN IF NOT EXISTS currency char(3) NOT NULL DEFAULT 'PKR';

-- ============ 6. SERVICE QUOTATIONS (customer approval required) ============
CREATE TABLE IF NOT EXISTS public.service_quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.service_bookings(id) ON DELETE CASCADE,
  provider_id uuid,
  customer_id uuid NOT NULL,
  labour_amount numeric(14,2) NOT NULL DEFAULT 0,
  parts_amount numeric(14,2) NOT NULL DEFAULT 0,
  other_amount numeric(14,2) NOT NULL DEFAULT 0,
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  currency char(3) NOT NULL DEFAULT 'PKR',
  details jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','approved','rejected','expired','superseded')),
  approved_at timestamptz,
  rejected_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_service_quotations_booking ON public.service_quotations (booking_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.service_quotations TO authenticated;
GRANT ALL ON public.service_quotations TO service_role;
ALTER TABLE public.service_quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quotation participants read" ON public.service_quotations
  FOR SELECT TO authenticated USING (
    customer_id = auth.uid() OR provider_id = auth.uid()
    OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'support')
  );
CREATE POLICY "provider or admin creates quotation" ON public.service_quotations
  FOR INSERT TO authenticated WITH CHECK (
    (provider_id = auth.uid() OR public.has_role(auth.uid(),'admin')) AND status = 'proposed'
  );
CREATE POLICY "customer or admin updates quotation" ON public.service_quotations
  FOR UPDATE TO authenticated USING (customer_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (customer_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER service_quotations_updated_at BEFORE UPDATE ON public.service_quotations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.guard_service_quotation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  NEW.total_amount := ROUND(COALESCE(NEW.labour_amount,0)+COALESCE(NEW.parts_amount,0)+COALESCE(NEW.other_amount,0), 2);
  IF TG_OP = 'UPDATE' THEN
    -- amounts are frozen once proposed; only status transitions allowed
    IF NEW.labour_amount IS DISTINCT FROM OLD.labour_amount
       OR NEW.parts_amount IS DISTINCT FROM OLD.parts_amount
       OR NEW.other_amount IS DISTINCT FROM OLD.other_amount THEN
      RAISE EXCEPTION 'Quotation amounts cannot be edited. Create a new quotation instead.';
    END IF;
    IF NEW.status = 'approved' AND OLD.status <> 'approved' THEN
      IF auth.uid() IS DISTINCT FROM OLD.customer_id AND NOT public.has_role(auth.uid(),'admin') THEN
        RAISE EXCEPTION 'Only the customer can approve a quotation';
      END IF;
      NEW.approved_at := now();
      UPDATE public.service_bookings SET total_amount = NEW.total_amount, updated_at = now()
        WHERE id = NEW.booking_id;
    END IF;
    IF NEW.status = 'rejected' AND OLD.status <> 'rejected' THEN NEW.rejected_at := now(); END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_guard_service_quotation
  BEFORE INSERT OR UPDATE ON public.service_quotations
  FOR EACH ROW EXECUTE FUNCTION public.guard_service_quotation();

-- ============ 7. ORDER LIFECYCLE TIMESTAMPS + GROCERY WEIGHT (additive) ============
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS ready_at timestamptz,
  ADD COLUMN IF NOT EXISTS rider_arrived_at timestamptz,
  ADD COLUMN IF NOT EXISTS picked_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS arrived_customer_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS currency char(3) NOT NULL DEFAULT 'PKR';

ALTER TABLE public.grocery_cart_orders
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS picking_at timestamptz,
  ADD COLUMN IF NOT EXISTS packed_at timestamptz,
  ADD COLUMN IF NOT EXISTS picked_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS weight_adjustment numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_amount numeric(14,2),
  ADD COLUMN IF NOT EXISTS weight_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS currency char(3) NOT NULL DEFAULT 'PKR';

CREATE OR REPLACE FUNCTION public.stamp_order_lifecycle()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_TABLE_NAME = 'orders' THEN
    IF NEW.status = 'preparing' AND NEW.accepted_at IS NULL THEN NEW.accepted_at := now(); END IF;
    IF NEW.status = 'delivering' AND NEW.picked_up_at IS NULL THEN NEW.picked_up_at := now(); END IF;
  ELSE
    IF NEW.status = 'confirmed' AND NEW.accepted_at IS NULL THEN NEW.accepted_at := now(); END IF;
    IF NEW.status = 'delivering' AND NEW.picked_up_at IS NULL THEN NEW.picked_up_at := now(); END IF;
  END IF;
  IF NEW.status IN ('delivered','completed') AND NEW.delivered_at IS NULL THEN NEW.delivered_at := now(); END IF;
  IF NEW.status = 'cancelled' AND NEW.cancelled_at IS NULL THEN NEW.cancelled_at := now(); END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_stamp_orders_lifecycle BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.stamp_order_lifecycle();
CREATE TRIGGER trg_stamp_gco_lifecycle BEFORE UPDATE ON public.grocery_cart_orders
  FOR EACH ROW EXECUTE FUNCTION public.stamp_order_lifecycle();

-- ============ 8. PAYMENT RECORD ON ORDER CREATION ============
CREATE OR REPLACE FUNCTION public.create_payment_for_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _kind text; _method text;
BEGIN
  _kind := CASE TG_TABLE_NAME WHEN 'orders' THEN 'food' WHEN 'grocery_cart_orders' THEN 'grocery_cart' ELSE 'service' END;
  _method := lower(COALESCE(NEW.payment_method,'cod'));
  IF _method NOT IN ('cod','bank_transfer','card','easypaisa','jazzcash','raast','wallet') THEN _method := 'other'; END IF;
  INSERT INTO public.payments (order_kind, order_id, customer_id, method, amount, status)
  VALUES (_kind, NEW.id, NEW.customer_id, _method, ROUND(COALESCE(NEW.total_amount,0),2), 'pending')
  ON CONFLICT (order_kind, order_id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_payment_on_food_order AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.create_payment_for_order();
CREATE TRIGGER trg_payment_on_grocery_order AFTER INSERT ON public.grocery_cart_orders
  FOR EACH ROW EXECUTE FUNCTION public.create_payment_for_order();
CREATE TRIGGER trg_payment_on_service_booking AFTER INSERT ON public.service_bookings
  FOR EACH ROW EXECUTE FUNCTION public.create_payment_for_order();

-- ============ 9. LEDGER + CASH JOURNAL POSTING ON DELIVERY / CANCELLATION ============
CREATE OR REPLACE FUNCTION public.zz_post_order_financials()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _kind text; _total numeric(14,2); _fee numeric(14,2); _comm numeric(14,2) := 0;
  _vendor uuid; _rider_pay numeric(14,2) := 0; _method text; _lines jsonb;
BEGIN
  _kind := CASE TG_TABLE_NAME WHEN 'orders' THEN 'food' ELSE 'grocery_cart' END;
  _method := lower(COALESCE(NEW.payment_method,'cod'));
  _total := ROUND(COALESCE(NEW.total_amount,0),2);
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
  END IF;

  IF NEW.status = 'cancelled' AND COALESCE(OLD.status,'') <> 'cancelled' THEN
    UPDATE public.payments
      SET status = CASE WHEN status = 'captured' THEN 'refunded' ELSE 'cancelled' END
      WHERE order_kind = _kind AND order_id = NEW.id;
  END IF;

  RETURN NEW;
END; $$;
CREATE TRIGGER zz_post_food_order_financials AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.zz_post_order_financials();
CREATE TRIGGER zz_post_grocery_order_financials AFTER UPDATE ON public.grocery_cart_orders
  FOR EACH ROW EXECUTE FUNCTION public.zz_post_order_financials();

-- remittance -> cash journal + ledger (approved only)
CREATE OR REPLACE FUNCTION public.zz_post_remittance_financials()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status = 'approved' AND COALESCE(OLD.status,'') <> 'approved' THEN
    INSERT INTO public.rider_cash_journal (rider_id, entry_type, remittance_id, amount, note, created_by)
    VALUES (NEW.rider_id, 'remitted', NEW.id, -ROUND(COALESCE(NEW.amount,0),2), 'Remittance approved', auth.uid());

    PERFORM public.post_ledger_txn('rider_remittance', 'remittance', NEW.id, jsonb_build_array(
      jsonb_build_object('account','bank_cash','direction','debit','amount', ROUND(COALESCE(NEW.amount,0),2)),
      jsonb_build_object('account','rider_cash_in_hand','party', NEW.rider_id::text, 'direction','credit','amount', ROUND(COALESCE(NEW.amount,0),2))
    ), 'Rider cash remitted');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER zz_post_remittance_financials AFTER UPDATE ON public.rider_remittances
  FOR EACH ROW EXECUTE FUNCTION public.zz_post_remittance_financials();

-- ============ 10. REFUND POSTING ============
CREATE OR REPLACE FUNCTION public.zz_post_refund_financials()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _paid numeric(14,2); _amt numeric(14,2);
BEGIN
  IF NEW.status = 'completed' AND COALESCE(OLD.status,'') <> 'completed' THEN
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
END; $$;
CREATE TRIGGER zz_post_refund_financials BEFORE UPDATE ON public.refunds
  FOR EACH ROW EXECUTE FUNCTION public.zz_post_refund_financials();

-- ============ 11. INDEXES (only where missing) ============
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON public.orders (restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON public.orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_rider ON public.orders (rider_id, status);
CREATE INDEX IF NOT EXISTS idx_gco_customer ON public.grocery_cart_orders (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gco_store ON public.grocery_cart_orders (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gco_status_created ON public.grocery_cart_orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_bookings_customer ON public.service_bookings (customer_id, created_at DESC);

-- ============ 12. LOCK THE LEGACY create_order PATH (kept, not dropped) ============
REVOKE ALL ON FUNCTION public.create_order(uuid, uuid, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
