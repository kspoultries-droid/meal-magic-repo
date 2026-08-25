DROP POLICY IF EXISTS "Customers upload own list order images" ON storage.objects;
DROP POLICY IF EXISTS "Customers update own list order images" ON storage.objects;
DROP POLICY IF EXISTS "Store owners upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Store owners update product images" ON storage.objects;
DROP POLICY IF EXISTS "Store owners upload store banners" ON storage.objects;
DROP POLICY IF EXISTS "Store owners update store banners" ON storage.objects;
DROP POLICY IF EXISTS "Store owners upload grocery list bills" ON storage.objects;
DROP POLICY IF EXISTS "Store owners update grocery list bills" ON storage.objects;
DROP POLICY IF EXISTS "Admins update product images" ON storage.objects;
DROP POLICY IF EXISTS "Users update own partner docs" ON storage.objects;

CREATE POLICY "Customers upload own list order images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (storage.foldername(storage.objects.name))[1] = 'list-orders'
  AND (storage.foldername(storage.objects.name))[2] = auth.uid()::text
);

CREATE POLICY "Customers update own list order images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (storage.foldername(storage.objects.name))[1] = 'list-orders'
  AND (storage.foldername(storage.objects.name))[2] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'product-images'
  AND (storage.foldername(storage.objects.name))[1] = 'list-orders'
  AND (storage.foldername(storage.objects.name))[2] = auth.uid()::text
);

CREATE POLICY "Store owners upload product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (storage.foldername(storage.objects.name))[1] = 'products'
  AND storage.filename(storage.objects.name) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]+$'
  AND EXISTS (
    SELECT 1
    FROM public.grocery_products gp
    JOIN public.grocery_stores gs ON gs.id = gp.store_id
    WHERE gp.id = split_part(storage.filename(storage.objects.name), '.', 1)::uuid
      AND gs.owner_id = auth.uid()
  )
);

CREATE POLICY "Store owners update product images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (storage.foldername(storage.objects.name))[1] = 'products'
  AND storage.filename(storage.objects.name) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]+$'
  AND EXISTS (
    SELECT 1
    FROM public.grocery_products gp
    JOIN public.grocery_stores gs ON gs.id = gp.store_id
    WHERE gp.id = split_part(storage.filename(storage.objects.name), '.', 1)::uuid
      AND gs.owner_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'product-images'
  AND (storage.foldername(storage.objects.name))[1] = 'products'
  AND storage.filename(storage.objects.name) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]+$'
  AND EXISTS (
    SELECT 1
    FROM public.grocery_products gp
    JOIN public.grocery_stores gs ON gs.id = gp.store_id
    WHERE gp.id = split_part(storage.filename(storage.objects.name), '.', 1)::uuid
      AND gs.owner_id = auth.uid()
  )
);

CREATE POLICY "Store owners upload store banners"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (storage.foldername(storage.objects.name))[1] = 'store-banners'
  AND storage.filename(storage.objects.name) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]+$'
  AND EXISTS (
    SELECT 1
    FROM public.grocery_stores gs
    WHERE gs.id = split_part(storage.filename(storage.objects.name), '.', 1)::uuid
      AND gs.owner_id = auth.uid()
  )
);

CREATE POLICY "Store owners update store banners"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (storage.foldername(storage.objects.name))[1] = 'store-banners'
  AND storage.filename(storage.objects.name) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]+$'
  AND EXISTS (
    SELECT 1
    FROM public.grocery_stores gs
    WHERE gs.id = split_part(storage.filename(storage.objects.name), '.', 1)::uuid
      AND gs.owner_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'product-images'
  AND (storage.foldername(storage.objects.name))[1] = 'store-banners'
  AND storage.filename(storage.objects.name) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]+$'
  AND EXISTS (
    SELECT 1
    FROM public.grocery_stores gs
    WHERE gs.id = split_part(storage.filename(storage.objects.name), '.', 1)::uuid
      AND gs.owner_id = auth.uid()
  )
);

CREATE POLICY "Store owners upload grocery list bills"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (storage.foldername(storage.objects.name))[1] = 'bills'
  AND storage.filename(storage.objects.name) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-.*\.[a-z0-9]+$'
  AND EXISTS (
    SELECT 1
    FROM public.grocery_list_orders glo
    JOIN public.grocery_stores gs ON gs.id = glo.store_id
    WHERE glo.id = substring(storage.filename(storage.objects.name) from '^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})')::uuid
      AND gs.owner_id = auth.uid()
  )
);

CREATE POLICY "Store owners update grocery list bills"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (storage.foldername(storage.objects.name))[1] = 'bills'
  AND storage.filename(storage.objects.name) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-.*\.[a-z0-9]+$'
  AND EXISTS (
    SELECT 1
    FROM public.grocery_list_orders glo
    JOIN public.grocery_stores gs ON gs.id = glo.store_id
    WHERE glo.id = substring(storage.filename(storage.objects.name) from '^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})')::uuid
      AND gs.owner_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'product-images'
  AND (storage.foldername(storage.objects.name))[1] = 'bills'
  AND storage.filename(storage.objects.name) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-.*\.[a-z0-9]+$'
  AND EXISTS (
    SELECT 1
    FROM public.grocery_list_orders glo
    JOIN public.grocery_stores gs ON gs.id = glo.store_id
    WHERE glo.id = substring(storage.filename(storage.objects.name) from '^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})')::uuid
      AND gs.owner_id = auth.uid()
  )
);

CREATE POLICY "Admins update product images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'product-images'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users update own partner docs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'partner-documents'
  AND (storage.foldername(storage.objects.name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'partner-documents'
  AND (storage.foldername(storage.objects.name))[1] = auth.uid()::text
);