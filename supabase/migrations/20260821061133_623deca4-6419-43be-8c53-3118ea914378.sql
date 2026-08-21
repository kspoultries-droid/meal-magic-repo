-- 1. Partner applications: prevent spoofing another user's account
DROP POLICY IF EXISTS "Anyone can submit application" ON public.partner_applications;
CREATE POLICY "Anyone can submit application"
ON public.partner_applications FOR INSERT TO anon, authenticated
WITH CHECK (
  status = 'pending'
  AND reviewed_by IS NULL
  AND reviewed_at IS NULL
  AND admin_notes IS NULL
  AND (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR (auth.uid() IS NULL AND user_id IS NULL)
  )
);

-- 2. Riders cannot self-credit wallet balance / earnings
CREATE OR REPLACE FUNCTION public.protect_rider_financials()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  NEW.wallet_balance := OLD.wallet_balance;
  NEW.total_earnings := OLD.total_earnings;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_rider_financials() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_protect_rider_financials ON public.riders;
CREATE TRIGGER trg_protect_rider_financials
BEFORE UPDATE ON public.riders
FOR EACH ROW EXECUTE FUNCTION public.protect_rider_financials();

CREATE OR REPLACE FUNCTION public.protect_rider_financials_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  NEW.wallet_balance := 0;
  NEW.total_earnings := 0;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_rider_financials_insert() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_protect_rider_financials_insert ON public.riders;
CREATE TRIGGER trg_protect_rider_financials_insert
BEFORE INSERT ON public.riders
FOR EACH ROW EXECUTE FUNCTION public.protect_rider_financials_insert();

-- 3. Customers cannot rewrite grocery list order pricing
CREATE OR REPLACE FUNCTION public.protect_grocery_list_pricing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL
     OR public.has_role(auth.uid(), 'admin')
     OR public.has_role(auth.uid(), 'support')
     OR EXISTS (
       SELECT 1 FROM public.grocery_stores s
       WHERE s.id = NEW.store_id AND s.owner_id = auth.uid()
     ) THEN
    RETURN NEW;
  END IF;
  NEW.total_amount := OLD.total_amount;
  NEW.delivery_fee := OLD.delivery_fee;
  NEW.store_id := OLD.store_id;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_grocery_list_pricing() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_protect_grocery_list_pricing ON public.grocery_list_orders;
CREATE TRIGGER trg_protect_grocery_list_pricing
BEFORE UPDATE ON public.grocery_list_orders
FOR EACH ROW EXECUTE FUNCTION public.protect_grocery_list_pricing();