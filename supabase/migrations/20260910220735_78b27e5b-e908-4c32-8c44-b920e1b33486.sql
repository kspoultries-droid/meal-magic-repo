ALTER TABLE public.payouts
  ADD COLUMN IF NOT EXISTS receipt_path text;

DROP POLICY IF EXISTS "Restaurant owners upload menu images" ON storage.objects;
DROP POLICY IF EXISTS "Restaurant owners update menu images" ON storage.objects;
DROP POLICY IF EXISTS "Restaurant owners select own images" ON storage.objects;

CREATE POLICY "Restaurant owners upload own restaurant images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] IN ('menu', 'restaurants')
  AND (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = ((storage.foldername(name))[2])::uuid
      AND r.owner_id = auth.uid()
  )
);

CREATE POLICY "Restaurant owners update own restaurant images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] IN ('menu', 'restaurants')
  AND (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = ((storage.foldername(name))[2])::uuid
      AND r.owner_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] IN ('menu', 'restaurants')
  AND (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = ((storage.foldername(name))[2])::uuid
      AND r.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "order_reviews_own_read" ON public.order_reviews;
CREATE POLICY "order_reviews_participant_read"
ON public.order_reviews FOR SELECT TO authenticated
USING (
  customer_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = order_reviews.restaurant_id
      AND r.owner_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'support')
);

CREATE POLICY "Admins upload payout receipts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'payout-receipts'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins update payout receipts"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'payout-receipts'
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'payout-receipts'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Payout participants view receipts"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'payout-receipts'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR (
      (storage.foldername(name))[1] = (auth.uid())::text
      AND EXISTS (
        SELECT 1 FROM public.payouts p
        WHERE p.vendor_id = auth.uid()
          AND p.receipt_path = storage.objects.name
      )
    )
  )
);