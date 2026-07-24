DROP POLICY IF EXISTS "Anyone view active wholesale categories" ON public.wholesale_categories;
CREATE POLICY "Anyone view active wholesale categories"
ON public.wholesale_categories
FOR SELECT
TO public
USING (is_active = true);