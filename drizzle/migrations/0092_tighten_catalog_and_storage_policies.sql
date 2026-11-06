DROP POLICY IF EXISTS "category supervisors read service evidence" ON storage.objects;
DROP POLICY IF EXISTS "Finance read scoped vendor receipts" ON storage.objects;
DROP POLICY IF EXISTS "Signed-in users read catalog" ON public.catalog_items;
CREATE POLICY "Shop owners read catalog" ON public.catalog_items FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.grocery_stores s WHERE s.owner_id = (select auth.uid())));