CREATE POLICY "Restaurant owners upload menu images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = 'menu'
  AND EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.owner_id = auth.uid()
      AND r.id = (substring(storage.filename(objects.name), '^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'))::uuid
  )
);

CREATE POLICY "Restaurant owners update menu images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = 'menu'
  AND EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.owner_id = auth.uid()
      AND r.id = (substring(storage.filename(objects.name), '^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'))::uuid
  )
)
WITH CHECK (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = 'menu'
  AND EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.owner_id = auth.uid()
      AND r.id = (substring(storage.filename(objects.name), '^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'))::uuid
  )
);