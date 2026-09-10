CREATE POLICY "Riders upload delivery proofs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'delivery-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Riders view own delivery proofs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'delivery-proofs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support')));

CREATE POLICY "Admins manage delivery proofs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'delivery-proofs' AND public.has_role(auth.uid(), 'admin'));