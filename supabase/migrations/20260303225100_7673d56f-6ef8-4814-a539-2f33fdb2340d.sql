
-- Allow support staff to view all orders
CREATE POLICY "Support view all orders"
ON public.orders FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'support'::app_role));

-- Allow support staff to update order status
CREATE POLICY "Support update order status"
ON public.orders FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'support'::app_role));

-- Allow support staff to view all profiles
CREATE POLICY "Support view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'support'::app_role));

-- Allow support to view order items
CREATE POLICY "Support view all order items"
ON public.order_items FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'support'::app_role));

-- Allow support to view grocery list orders
CREATE POLICY "Support view grocery list orders"
ON public.grocery_list_orders FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'support'::app_role));

-- Allow support to update grocery list order status
CREATE POLICY "Support update grocery list orders"
ON public.grocery_list_orders FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'support'::app_role));

-- Allow support to view restaurants
CREATE POLICY "Support view all restaurants"
ON public.restaurants FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'support'::app_role));

-- Allow support to view grocery stores
CREATE POLICY "Support view all grocery stores"
ON public.grocery_stores FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'support'::app_role));

-- Allow support to view service bookings
CREATE POLICY "Support view service bookings"
ON public.service_bookings FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'support'::app_role));

-- Allow support to update service booking status
CREATE POLICY "Support update service bookings"
ON public.service_bookings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'support'::app_role));
