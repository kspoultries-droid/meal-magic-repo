-- 1) Riders can read items of unassigned nearby orders
CREATE POLICY "Riders view items of available orders"
ON public.order_items FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.orders o
  WHERE o.id = order_items.order_id
    AND o.rider_id IS NULL
    AND o.status = ANY (ARRAY['confirmed','preparing','delivering'])
    AND public.has_role(auth.uid(), 'rider')
));

-- 2) Riders may only update their own assigned orders (admin does assignment)
DROP POLICY IF EXISTS "Riders accept available orders" ON public.orders;

-- 3) Credit rider earnings on delivery + settle cash payment
CREATE OR REPLACE FUNCTION public.settle_order_on_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered' THEN
    IF NEW.rider_id IS NOT NULL THEN
      UPDATE public.riders
        SET total_earnings = COALESCE(total_earnings, 0) + COALESCE(NEW.delivery_fee, 0),
            wallet_balance = COALESCE(wallet_balance, 0) + COALESCE(NEW.delivery_fee, 0),
            updated_at = now()
      WHERE id = NEW.rider_id;
    END IF;
    IF COALESCE(NEW.payment_method, 'cod') = 'cod' THEN
      NEW.payment_status := 'paid';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS settle_order_on_delivery_trigger ON public.orders;
CREATE TRIGGER settle_order_on_delivery_trigger
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.settle_order_on_delivery();

REVOKE EXECUTE ON FUNCTION public.settle_order_on_delivery() FROM PUBLIC, anon, authenticated;

-- 4) Safe rider info for the order's customer
CREATE OR REPLACE FUNCTION public.get_order_rider_info(_order_id uuid)
RETURNS TABLE(rider_name text, rider_phone text, lat double precision, lng double precision)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.full_name, p.phone, r.current_lat, r.current_lng
  FROM public.orders o
  JOIN public.riders r ON r.id = o.rider_id
  LEFT JOIN public.profiles p ON p.id = o.rider_id
  WHERE o.id = _order_id
    AND o.rider_id IS NOT NULL
    AND (o.customer_id = auth.uid()
         OR public.has_role(auth.uid(), 'admin')
         OR public.has_role(auth.uid(), 'support'))
$$;

REVOKE EXECUTE ON FUNCTION public.get_order_rider_info(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_order_rider_info(uuid) TO authenticated;