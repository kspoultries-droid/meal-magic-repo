GRANT SELECT ON public.wholesale_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wholesale_categories TO authenticated;
GRANT ALL ON public.wholesale_categories TO service_role;
ALTER TABLE public.wholesale_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view active wholesale categories" ON public.wholesale_categories;
DROP POLICY IF EXISTS "Admins manage wholesale categories" ON public.wholesale_categories;
CREATE POLICY "Public can view active wholesale categories" ON public.wholesale_categories FOR SELECT TO anon, authenticated USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage wholesale categories" ON public.wholesale_categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));