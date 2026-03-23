
-- Drop old rider RLS policies for orders
DROP POLICY IF EXISTS "Riders view available orders" ON public.orders;
DROP POLICY IF EXISTS "Riders accept available orders" ON public.orders;

-- New: Riders can VIEW orders that are confirmed, preparing, or delivering (and unassigned)
CREATE POLICY "Riders view available orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'rider'::app_role)
  AND status IN ('confirmed', 'preparing', 'delivering')
  AND rider_id IS NULL
);

-- New: Riders can ACCEPT (update) orders that are confirmed, preparing, or delivering (and unassigned)
CREATE POLICY "Riders accept available orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'rider'::app_role)
  AND status IN ('confirmed', 'preparing', 'delivering')
  AND rider_id IS NULL
);
