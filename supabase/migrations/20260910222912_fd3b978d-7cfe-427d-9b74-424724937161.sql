DROP POLICY IF EXISTS "Restaurant owners upload own restaurant images" ON storage.objects;
DROP POLICY IF EXISTS "Restaurant owners update own restaurant images" ON storage.objects;

CREATE POLICY "Restaurant owners upload own restaurant images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] IN ('menu', 'restaurants')
  AND (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND EXISTS (
    SELECT 1
    FROM public.restaurants restaurant
    WHERE restaurant.id = ((storage.foldername(storage.objects.name))[2])::uuid
      AND restaurant.owner_id = auth.uid()
  )
);

CREATE POLICY "Restaurant owners update own restaurant images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] IN ('menu', 'restaurants')
  AND (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND EXISTS (
    SELECT 1
    FROM public.restaurants restaurant
    WHERE restaurant.id = ((storage.foldername(storage.objects.name))[2])::uuid
      AND restaurant.owner_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] IN ('menu', 'restaurants')
  AND (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND EXISTS (
    SELECT 1
    FROM public.restaurants restaurant
    WHERE restaurant.id = ((storage.foldername(storage.objects.name))[2])::uuid
      AND restaurant.owner_id = auth.uid()
  )
);