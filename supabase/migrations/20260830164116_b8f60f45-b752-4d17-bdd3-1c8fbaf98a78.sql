-- ============ 1. RIDER REMITTANCES ============
CREATE TABLE public.rider_remittances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  method text NOT NULL DEFAULT 'cash',
  receipt_url text,
  note text,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.rider_remittances TO authenticated;
GRANT ALL ON public.rider_remittances TO service_role;

ALTER TABLE public.rider_remittances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Riders view own remittances" ON public.rider_remittances
  FOR SELECT TO authenticated
  USING (rider_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'));

CREATE POLICY "Riders submit own remittances" ON public.rider_remittances
  FOR INSERT TO authenticated
  WITH CHECK (rider_id = auth.uid() AND status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL);

CREATE TRIGGER rider_remittances_updated_at
  BEFORE UPDATE ON public.rider_remittances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_rider_remittances_rider ON public.rider_remittances(rider_id, created_at DESC);
CREATE INDEX idx_rider_remittances_status ON public.rider_remittances(status, created_at DESC);

-- Admin-only review + wallet settlement
CREATE OR REPLACE FUNCTION public.review_rider_remittance(_id uuid, _approve boolean, _note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _r public.rider_remittances%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can review remittances';
  END IF;

  SELECT * INTO _r FROM public.rider_remittances WHERE id = _id FOR UPDATE;
  IF _r.id IS NULL THEN RAISE EXCEPTION 'Remittance not found'; END IF;
  IF _r.status <> 'pending' THEN RAISE EXCEPTION 'Already reviewed'; END IF;

  UPDATE public.rider_remittances
    SET status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
        admin_note = _note,
        reviewed_by = auth.uid(),
        reviewed_at = now()
    WHERE id = _id;

  IF _approve THEN
    UPDATE public.riders
      SET wallet_balance = COALESCE(wallet_balance, 0) - _r.amount,
          updated_at = now()
      WHERE id = _r.rider_id;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.review_rider_remittance(uuid, boolean, text) FROM anon;

-- ============ 2. GROCERY / BAZAR REVIEWS ============
CREATE TABLE public.grocery_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  store_id uuid NOT NULL REFERENCES public.grocery_stores(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  reply text,
  replied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, customer_id)
);

GRANT SELECT, INSERT, UPDATE ON public.grocery_reviews TO authenticated;
GRANT SELECT ON public.grocery_reviews TO anon;
GRANT ALL ON public.grocery_reviews TO service_role;

ALTER TABLE public.grocery_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read grocery reviews" ON public.grocery_reviews
  FOR SELECT USING (true);

CREATE POLICY "Customers write own grocery reviews" ON public.grocery_reviews
  FOR INSERT TO authenticated WITH CHECK (customer_id = auth.uid() AND reply IS NULL);

CREATE POLICY "Customers edit own grocery reviews" ON public.grocery_reviews
  FOR UPDATE TO authenticated USING (customer_id = auth.uid()) WITH CHECK (customer_id = auth.uid());

CREATE TRIGGER grocery_reviews_updated_at
  BEFORE UPDATE ON public.grocery_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_grocery_reviews_store ON public.grocery_reviews(store_id, created_at DESC);

-- Keep vendor replies out of customer UPDATE reach
CREATE OR REPLACE FUNCTION public.protect_grocery_review_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('app.bypass_review_guard', true) = 'on' THEN RETURN NEW; END IF;
  NEW.reply := OLD.reply;
  NEW.replied_at := OLD.replied_at;
  NEW.customer_id := OLD.customer_id;
  NEW.store_id := OLD.store_id;
  NEW.order_id := OLD.order_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_grocery_review_reply
  BEFORE UPDATE ON public.grocery_reviews
  FOR EACH ROW EXECUTE FUNCTION public.protect_grocery_review_reply();

-- ============ 3. VENDOR REPLIES ON EXISTING REVIEWS ============
ALTER TABLE public.order_reviews ADD COLUMN IF NOT EXISTS reply text;
ALTER TABLE public.order_reviews ADD COLUMN IF NOT EXISTS replied_at timestamptz;
ALTER TABLE public.service_reviews ADD COLUMN IF NOT EXISTS reply text;
ALTER TABLE public.service_reviews ADD COLUMN IF NOT EXISTS replied_at timestamptz;

CREATE OR REPLACE FUNCTION public.reply_to_review(_kind text, _review_id uuid, _reply text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _allowed boolean := false;
  _clean text := NULLIF(trim(_reply), '');
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _clean IS NOT NULL AND length(_clean) > 1000 THEN RAISE EXCEPTION 'Reply too long'; END IF;

  IF _kind = 'food' THEN
    SELECT public.has_role(auth.uid(), 'admin')
        OR EXISTS (SELECT 1 FROM public.order_reviews rv
                   JOIN public.restaurants r ON r.id = rv.restaurant_id
                   WHERE rv.id = _review_id AND r.owner_id = auth.uid())
      INTO _allowed;
    IF NOT _allowed THEN RAISE EXCEPTION 'Not allowed'; END IF;
    UPDATE public.order_reviews SET reply = _clean, replied_at = now() WHERE id = _review_id;

  ELSIF _kind = 'grocery' THEN
    SELECT public.has_role(auth.uid(), 'admin')
        OR EXISTS (SELECT 1 FROM public.grocery_reviews rv
                   JOIN public.grocery_stores s ON s.id = rv.store_id
                   WHERE rv.id = _review_id AND s.owner_id = auth.uid())
      INTO _allowed;
    IF NOT _allowed THEN RAISE EXCEPTION 'Not allowed'; END IF;
    PERFORM set_config('app.bypass_review_guard', 'on', true);
    UPDATE public.grocery_reviews SET reply = _clean, replied_at = now() WHERE id = _review_id;

  ELSIF _kind = 'service' THEN
    SELECT public.has_role(auth.uid(), 'admin')
        OR EXISTS (SELECT 1 FROM public.service_reviews rv
                   JOIN public.service_providers p ON p.id = rv.provider_id
                   WHERE rv.id = _review_id AND p.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.service_reviews rv
                   JOIN public.services sv ON sv.id = rv.service_id
                   WHERE rv.id = _review_id AND public.manages_category(auth.uid(), sv.category_id))
      INTO _allowed;
    IF NOT _allowed THEN RAISE EXCEPTION 'Not allowed'; END IF;
    UPDATE public.service_reviews SET reply = _clean, replied_at = now() WHERE id = _review_id;
  ELSE
    RAISE EXCEPTION 'Invalid review kind';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reply_to_review(text, uuid, text) FROM anon;

-- ============ 4. VENDOR PAYOUT CONFIRMATION ============
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS vendor_confirmed_at timestamptz;

CREATE OR REPLACE FUNCTION public.confirm_payout_received(_payout_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.payouts
    SET vendor_confirmed_at = now(),
        status = 'completed'
    WHERE id = _payout_id AND vendor_id = auth.uid() AND vendor_confirmed_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payout not found or already confirmed'; END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.confirm_payout_received(uuid) FROM anon;