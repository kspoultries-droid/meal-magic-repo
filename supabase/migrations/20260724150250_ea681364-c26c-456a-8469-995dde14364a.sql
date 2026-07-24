DROP POLICY IF EXISTS "Admins manage all ads" ON public.promotional_ads;
CREATE POLICY "Admins manage all ads"
ON public.promotional_ads
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins manage wholesale categories" ON public.wholesale_categories;
CREATE POLICY "Admins manage wholesale categories"
ON public.wholesale_categories
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));