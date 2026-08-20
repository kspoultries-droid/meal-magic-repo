
ALTER TABLE public.grocery_cart_orders
  ADD COLUMN IF NOT EXISTS rider_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS rider_assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_fee numeric NOT NULL DEFAULT 0;

ALTER TABLE public.grocery_list_orders
  ADD COLUMN IF NOT EXISTS rider_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS rider_assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_fee numeric NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_gco_rider ON public.grocery_cart_orders(rider_id);
CREATE INDEX IF NOT EXISTS idx_glo_rider ON public.grocery_list_orders(rider_id);

-- Riders: view assigned + nearby unassigned rider-delivery orders
CREATE POLICY "Riders view assigned grocery cart orders"
ON public.grocery_cart_orders FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'rider')
  AND (
    rider_id = auth.uid()
    OR (rider_id IS NULL AND delivery_method = 'rider'
        AND status IN ('confirmed','preparing','ready','delivering','out_for_delivery'))
  )
);

CREATE POLICY "Riders update own grocery cart orders"
ON public.grocery_cart_orders FOR UPDATE TO authenticated
USING (rider_id = auth.uid() AND public.has_role(auth.uid(), 'rider'))
WITH CHECK (rider_id = auth.uid());

CREATE POLICY "Riders view assigned grocery list orders"
ON public.grocery_list_orders FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'rider')
  AND (
    rider_id = auth.uid()
    OR (rider_id IS NULL
        AND status IN ('confirmed','preparing','ready','delivering','out_for_delivery'))
  )
);

CREATE POLICY "Riders update own grocery list orders"
ON public.grocery_list_orders FOR UPDATE TO authenticated
USING (rider_id = auth.uid() AND public.has_role(auth.uid(), 'rider'))
WITH CHECK (rider_id = auth.uid());

-- Settle rider earnings when a grocery order is delivered
CREATE OR REPLACE FUNCTION public.settle_grocery_order_on_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('delivered','completed')
     AND COALESCE(OLD.status,'') NOT IN ('delivered','completed')
     AND NEW.rider_id IS NOT NULL THEN
    UPDATE public.riders
      SET total_earnings = COALESCE(total_earnings,0) + COALESCE(NEW.delivery_fee,0),
          wallet_balance = COALESCE(wallet_balance,0) + COALESCE(NEW.delivery_fee,0),
          updated_at = now()
      WHERE id = NEW.rider_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_settle_grocery_cart_order ON public.grocery_cart_orders;
CREATE TRIGGER trg_settle_grocery_cart_order
AFTER UPDATE ON public.grocery_cart_orders
FOR EACH ROW EXECUTE FUNCTION public.settle_grocery_order_on_delivery();

DROP TRIGGER IF EXISTS trg_settle_grocery_list_order ON public.grocery_list_orders;
CREATE TRIGGER trg_settle_grocery_list_order
AFTER UPDATE ON public.grocery_list_orders
FOR EACH ROW EXECUTE FUNCTION public.settle_grocery_order_on_delivery();

ALTER TABLE public.grocery_cart_orders REPLICA IDENTITY FULL;
ALTER TABLE public.grocery_list_orders REPLICA IDENTITY FULL;
