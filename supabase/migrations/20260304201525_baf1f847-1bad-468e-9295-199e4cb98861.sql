
-- Fix grocery_stores RLS: drop RESTRICTIVE policies and recreate as PERMISSIVE

DROP POLICY IF EXISTS "Admins manage all grocery stores" ON public.grocery_stores;
DROP POLICY IF EXISTS "Anyone can view active grocery stores" ON public.grocery_stores;
DROP POLICY IF EXISTS "Owners manage own grocery stores" ON public.grocery_stores;
DROP POLICY IF EXISTS "Support view all grocery stores" ON public.grocery_stores;

CREATE POLICY "Admins manage all grocery stores" ON public.grocery_stores
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active grocery stores" ON public.grocery_stores
FOR SELECT TO anon, authenticated
USING (is_active = true);

CREATE POLICY "Owners manage own grocery stores" ON public.grocery_stores
FOR ALL TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Support view all grocery stores" ON public.grocery_stores
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'support'::app_role));
