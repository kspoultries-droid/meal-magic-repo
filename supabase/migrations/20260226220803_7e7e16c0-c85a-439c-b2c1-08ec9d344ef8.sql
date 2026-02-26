-- Allow riders to see orders with status 'delivering' that have no rider assigned yet (for pickup)
CREATE POLICY "Riders view available orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'rider'::app_role)
  AND status = 'delivering'
  AND rider_id IS NULL
);