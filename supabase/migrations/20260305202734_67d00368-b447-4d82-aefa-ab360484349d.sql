
-- Allow everyone to see ALL service categories (active + inactive)
DROP POLICY IF EXISTS "Anyone can view active service categories" ON public.service_categories;
CREATE POLICY "Anyone can view all service categories" ON public.service_categories FOR SELECT USING (true);
