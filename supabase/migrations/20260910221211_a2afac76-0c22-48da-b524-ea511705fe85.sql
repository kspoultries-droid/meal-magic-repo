CREATE POLICY "Admins delete payout receipts"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'payout-receipts'
  AND public.has_role(auth.uid(), 'admin')
);