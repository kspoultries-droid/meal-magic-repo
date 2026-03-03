
-- Drop ALL existing restrictive policies and recreate as PERMISSIVE

-- ═══ RESTAURANTS ═══
DROP POLICY IF EXISTS "Admins manage all restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Anyone can view active restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Owners manage own restaurants" ON public.restaurants;

CREATE POLICY "Admins manage all restaurants" ON public.restaurants FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view active restaurants" ON public.restaurants FOR SELECT USING (is_active = true);
CREATE POLICY "Owners manage own restaurants" ON public.restaurants FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- ═══ MENU_ITEMS ═══
DROP POLICY IF EXISTS "Admins manage all menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Anyone can view available menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Owners manage own menu items" ON public.menu_items;

CREATE POLICY "Admins manage all menu items" ON public.menu_items FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view available menu items" ON public.menu_items FOR SELECT USING (is_available = true);
CREATE POLICY "Owners manage own menu items" ON public.menu_items FOR ALL TO authenticated USING (owns_restaurant(auth.uid(), restaurant_id)) WITH CHECK (owns_restaurant(auth.uid(), restaurant_id));

-- ═══ ORDERS ═══
DROP POLICY IF EXISTS "Admins manage all orders" ON public.orders;
DROP POLICY IF EXISTS "Customers create orders" ON public.orders;
DROP POLICY IF EXISTS "Customers view own orders" ON public.orders;
DROP POLICY IF EXISTS "Restaurant owners update their orders" ON public.orders;
DROP POLICY IF EXISTS "Restaurant owners view their orders" ON public.orders;
DROP POLICY IF EXISTS "Riders update assigned orders" ON public.orders;
DROP POLICY IF EXISTS "Riders view assigned orders" ON public.orders;
DROP POLICY IF EXISTS "Riders view available orders" ON public.orders;

CREATE POLICY "Admins manage all orders" ON public.orders FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Customers create orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Customers view own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = customer_id);
CREATE POLICY "Restaurant owners update their orders" ON public.orders FOR UPDATE TO authenticated USING (owns_restaurant(auth.uid(), restaurant_id));
CREATE POLICY "Restaurant owners view their orders" ON public.orders FOR SELECT TO authenticated USING (owns_restaurant(auth.uid(), restaurant_id));
CREATE POLICY "Riders update assigned orders" ON public.orders FOR UPDATE TO authenticated USING (auth.uid() = rider_id);
CREATE POLICY "Riders view assigned orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = rider_id);
CREATE POLICY "Riders view available orders" ON public.orders FOR SELECT TO authenticated USING (has_role(auth.uid(), 'rider'::app_role) AND status = 'delivering' AND rider_id IS NULL);

-- ═══ ORDER_ITEMS ═══
DROP POLICY IF EXISTS "Admins manage order items" ON public.order_items;
DROP POLICY IF EXISTS "Customers create order items" ON public.order_items;
DROP POLICY IF EXISTS "Order participants view items" ON public.order_items;

CREATE POLICY "Admins manage order items" ON public.order_items FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Customers create order items" ON public.order_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.customer_id = auth.uid()));
CREATE POLICY "Order participants view items" ON public.order_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND (orders.customer_id = auth.uid() OR orders.rider_id = auth.uid() OR owns_restaurant(auth.uid(), orders.restaurant_id))));

-- ═══ RIDERS ═══
DROP POLICY IF EXISTS "Admins manage riders" ON public.riders;
DROP POLICY IF EXISTS "Riders insert own data" ON public.riders;
DROP POLICY IF EXISTS "Riders update own data" ON public.riders;
DROP POLICY IF EXISTS "Riders view own data" ON public.riders;

CREATE POLICY "Admins manage riders" ON public.riders FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Riders insert own data" ON public.riders FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Riders update own data" ON public.riders FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Riders view own data" ON public.riders FOR SELECT TO authenticated USING (auth.uid() = id);

-- ═══ PROFILES ═══
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

-- ═══ USER_ROLES ═══
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ═══ CITIES ═══
DROP POLICY IF EXISTS "Admins manage cities" ON public.cities;
DROP POLICY IF EXISTS "Anyone can view cities" ON public.cities;

CREATE POLICY "Admins manage cities" ON public.cities FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view cities" ON public.cities FOR SELECT USING (true);

-- Also allow riders to update orders they want to accept (rider_id IS NULL)
CREATE POLICY "Riders accept available orders" ON public.orders FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'rider'::app_role) AND status = 'delivering' AND rider_id IS NULL);
