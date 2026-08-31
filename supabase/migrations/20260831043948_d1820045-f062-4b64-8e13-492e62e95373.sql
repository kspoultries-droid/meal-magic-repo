-- ========== 1. EasyLife payment accounts ==========
CREATE TABLE public.payment_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  method text NOT NULL DEFAULT 'bank',
  bank_name text,
  account_title text,
  account_number text,
  is_active boolean NOT NULL DEFAULT true,
  balance numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_accounts TO authenticated;
GRANT ALL ON public.payment_accounts TO service_role;
ALTER TABLE public.payment_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view active accounts" ON public.payment_accounts
  FOR SELECT TO authenticated USING (is_active = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage payment accounts" ON public.payment_accounts
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
GRANT INSERT, UPDATE, DELETE ON public.payment_accounts TO authenticated;
CREATE TRIGGER payment_accounts_updated_at BEFORE UPDATE ON public.payment_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- balance may only be changed by definer functions
CREATE OR REPLACE FUNCTION public.protect_payment_account_balance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('app.bypass_ledger_guard', true) = 'on' THEN RETURN NEW; END IF;
  NEW.balance := OLD.balance;
  RETURN NEW;
END; $$;
CREATE TRIGGER payment_accounts_protect_balance BEFORE UPDATE ON public.payment_accounts
  FOR EACH ROW EXECUTE FUNCTION public.protect_payment_account_balance();

-- ========== 2. Vendor bank accounts ==========
CREATE TABLE public.vendor_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method text NOT NULL DEFAULT 'bank',
  bank_name text,
  account_title text NOT NULL,
  account_number text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, account_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_bank_accounts TO authenticated;
GRANT ALL ON public.vendor_bank_accounts TO service_role;
ALTER TABLE public.vendor_bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage own bank accounts" ON public.vendor_bank_accounts
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins view vendor bank accounts" ON public.vendor_bank_accounts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'support'));
CREATE TRIGGER vendor_bank_accounts_updated_at BEFORE UPDATE ON public.vendor_bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== 3. Immutable bank ledger ==========
CREATE TABLE public.bank_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.payment_accounts(id),
  direction text NOT NULL CHECK (direction IN ('in','out')),
  amount numeric NOT NULL CHECK (amount > 0),
  balance_after numeric NOT NULL,
  source_type text NOT NULL,
  source_id uuid,
  counterparty_id uuid,
  counterparty_label text,
  destination_account text,
  reference_no text,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bank_ledger_account ON public.bank_ledger(account_id, created_at DESC);
CREATE INDEX idx_bank_ledger_counterparty ON public.bank_ledger(counterparty_id, created_at DESC);
GRANT SELECT ON public.bank_ledger TO authenticated;
GRANT ALL ON public.bank_ledger TO service_role;
ALTER TABLE public.bank_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read full ledger" ON public.bank_ledger
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'support'));
CREATE POLICY "Parties read own ledger rows" ON public.bank_ledger
  FOR SELECT TO authenticated USING (counterparty_id = auth.uid());

-- ========== 4. Remittance / payout columns ==========
ALTER TABLE public.rider_remittances
  ADD COLUMN account_id uuid REFERENCES public.payment_accounts(id),
  ADD COLUMN reference_no text;
CREATE UNIQUE INDEX idx_remit_reference_unique ON public.rider_remittances(lower(trim(reference_no)))
  WHERE reference_no IS NOT NULL AND status <> 'rejected';
CREATE UNIQUE INDEX idx_remit_one_pending ON public.rider_remittances(rider_id) WHERE status = 'pending';

ALTER TABLE public.payouts
  ADD COLUMN from_account_id uuid REFERENCES public.payment_accounts(id),
  ADD COLUMN vendor_account_id uuid REFERENCES public.vendor_bank_accounts(id),
  ADD COLUMN reference_no text;

-- ========== 5. Rider cash due ==========
CREATE OR REPLACE FUNCTION public.rider_cash_due(_rider uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH o AS (
    SELECT delivery_fee, total_amount, payment_method FROM public.orders
      WHERE rider_id = _rider AND status IN ('delivered','completed')
    UNION ALL
    SELECT delivery_fee, total_amount, payment_method FROM public.grocery_cart_orders
      WHERE rider_id = _rider AND status IN ('delivered','completed')
    UNION ALL
    SELECT delivery_fee, total_amount, NULL::text FROM public.grocery_list_orders
      WHERE rider_id = _rider AND status IN ('delivered','completed')
  ), r AS (
    SELECT COALESCE(SUM(amount) FILTER (WHERE status IN ('approved','pending')),0) AS settled
    FROM public.rider_remittances WHERE rider_id = _rider
  )
  SELECT GREATEST(0,
    COALESCE((SELECT SUM(total_amount) FROM o WHERE COALESCE(payment_method,'cod')='cod'),0)
    - COALESCE((SELECT SUM(delivery_fee) FROM o),0)
    - (SELECT settled FROM r));
$$;

-- ========== 6. Anti-fraud guard on remittance insert ==========
CREATE OR REPLACE FUNCTION public.guard_rider_remittance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _due numeric;
BEGIN
  IF NEW.rider_id <> auth.uid() AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'صرف اپنی رقم جمع کرا سکتے ہیں';
  END IF;
  IF NEW.account_id IS NULL THEN
    RAISE EXCEPTION 'براہ کرم EasyLife اکاؤنٹ منتخب کریں';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.payment_accounts WHERE id = NEW.account_id AND is_active) THEN
    RAISE EXCEPTION 'یہ اکاؤنٹ فعال نہیں';
  END IF;
  _due := public.rider_cash_due(NEW.rider_id);
  IF NEW.amount > _due + 1 THEN
    RAISE EXCEPTION 'واجب الادا رقم (Rs %) سے زیادہ جمع نہیں کرا سکتے', round(_due);
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.rider_remittances
    WHERE rider_id = NEW.rider_id AND amount = NEW.amount
      AND status <> 'rejected' AND created_at > now() - interval '10 minutes'
  ) THEN
    RAISE EXCEPTION 'یہی رقم ابھی جمع کرائی جا چکی ہے — دوبارہ نہ بھیجیں';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER rider_remittances_guard BEFORE INSERT ON public.rider_remittances
  FOR EACH ROW EXECUTE FUNCTION public.guard_rider_remittance();

-- ========== 7. Review remittance -> credit account + ledger ==========
CREATE OR REPLACE FUNCTION public.review_rider_remittance(_id uuid, _approve boolean, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _r public.rider_remittances%ROWTYPE;
  _bal numeric;
  _label text;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only admins can review remittances';
  END IF;
  SELECT * INTO _r FROM public.rider_remittances WHERE id = _id FOR UPDATE;
  IF _r.id IS NULL THEN RAISE EXCEPTION 'Remittance not found'; END IF;
  IF _r.status <> 'pending' THEN RAISE EXCEPTION 'Already reviewed'; END IF;

  UPDATE public.rider_remittances
    SET status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
        admin_note = _note, reviewed_by = auth.uid(), reviewed_at = now()
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
END; $$;
REVOKE EXECUTE ON FUNCTION public.review_rider_remittance(uuid, boolean, text) FROM anon;

-- ========== 8. Vendor payable + admin payout RPC ==========
CREATE OR REPLACE FUNCTION public.vendor_payable(_vendor uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT GREATEST(0,
    COALESCE((SELECT SUM(net_payable) FROM public.platform_commissions WHERE vendor_id = _vendor),0)
    - COALESCE((SELECT SUM(amount) FROM public.payouts WHERE vendor_id = _vendor AND status <> 'cancelled'),0));
$$;

CREATE OR REPLACE FUNCTION public.admin_pay_vendor(
  _vendor_id uuid, _amount numeric, _from_account_id uuid, _vendor_account_id uuid,
  _period_start date, _period_end date, _reference_no text DEFAULT NULL, _notes text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _payable numeric; _bal numeric; _payout uuid; _label text; _dest text;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Only admins can pay vendors'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'رقم درست نہیں'; END IF;

  _payable := public.vendor_payable(_vendor_id);
  IF _amount > _payable + 1 THEN
    RAISE EXCEPTION 'واجب الادا رقم (Rs %) سے زیادہ ادائیگی ممکن نہیں', round(_payable);
  END IF;

  IF _reference_no IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.payouts WHERE lower(trim(reference_no)) = lower(trim(_reference_no))) THEN
    RAISE EXCEPTION 'یہ ریفرنس نمبر پہلے استعمال ہو چکا ہے';
  END IF;
  IF EXISTS (SELECT 1 FROM public.payouts WHERE vendor_id=_vendor_id AND amount=_amount
             AND created_at > now() - interval '10 minutes' AND status <> 'cancelled') THEN
    RAISE EXCEPTION 'یہی ادائیگی ابھی ریکارڈ ہو چکی ہے';
  END IF;

  SELECT balance INTO _bal FROM public.payment_accounts WHERE id = _from_account_id AND is_active FOR UPDATE;
  IF _bal IS NULL THEN RAISE EXCEPTION 'EasyLife اکاؤنٹ منتخب کریں'; END IF;
  IF _bal < _amount THEN RAISE EXCEPTION 'اکاؤنٹ میں کافی بیلنس نہیں (Rs %)', round(_bal); END IF;

  SELECT bank_name || ' • ' || account_number INTO _dest FROM public.vendor_bank_accounts
    WHERE id = _vendor_account_id AND user_id = _vendor_id;

  INSERT INTO public.payouts (vendor_id, amount, period_start, period_end, payout_method, status,
    processed_by, processed_at, notes, from_account_id, vendor_account_id, reference_no)
  VALUES (_vendor_id, _amount, _period_start, _period_end,
    COALESCE((SELECT method FROM public.vendor_bank_accounts WHERE id=_vendor_account_id),'bank'),
    'paid', auth.uid(), now(), _notes, _from_account_id, _vendor_account_id, _reference_no)
  RETURNING id INTO _payout;

  PERFORM set_config('app.bypass_ledger_guard','on', true);
  UPDATE public.payment_accounts SET balance = balance - _amount, updated_at = now()
    WHERE id = _from_account_id RETURNING balance INTO _bal;

  SELECT full_name INTO _label FROM public.profiles WHERE id = _vendor_id;
  INSERT INTO public.bank_ledger (account_id, direction, amount, balance_after, source_type, source_id,
    counterparty_id, counterparty_label, destination_account, reference_no, note, created_by)
  VALUES (_from_account_id, 'out', _amount, _bal, 'vendor_payout', _payout,
    _vendor_id, COALESCE(_label,'وینڈر'), _dest, _reference_no, _notes, auth.uid());

  RETURN _payout;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_pay_vendor(uuid,numeric,uuid,uuid,date,date,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rider_cash_due(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.vendor_payable(uuid) FROM anon;

-- ========== 9. Block manual payout inserts (must go through RPC) ==========
CREATE OR REPLACE FUNCTION public.guard_payout_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('app.bypass_ledger_guard', true) <> 'on' AND NEW.from_account_id IS NULL THEN
    RAISE EXCEPTION 'ادائیگی صرف EasyLife اکاؤنٹ سے ہو سکتی ہے';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER payouts_guard BEFORE INSERT ON public.payouts
  FOR EACH ROW EXECUTE FUNCTION public.guard_payout_insert();