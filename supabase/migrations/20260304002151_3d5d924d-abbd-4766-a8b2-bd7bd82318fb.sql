
CREATE POLICY "Customers update own list orders"
ON public.grocery_list_orders
FOR UPDATE
USING (auth.uid() = customer_id)
WITH CHECK (auth.uid() = customer_id);
