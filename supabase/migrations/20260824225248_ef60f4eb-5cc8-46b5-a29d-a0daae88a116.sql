CREATE POLICY "Vendors upload reel videos to product-images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = 'reels'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.restaurants r WHERE r.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.grocery_stores s WHERE s.owner_id = auth.uid())
  )
);