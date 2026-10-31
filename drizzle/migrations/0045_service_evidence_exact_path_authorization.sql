CREATE OR REPLACE FUNCTION public.can_upload_service_evidence(_path text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT split_part(_path,'/',1)=auth.uid()::text AND EXISTS(SELECT 1 FROM service_bookings b JOIN service_providers p ON p.id=b.provider_id WHERE b.id::text=split_part(_path,'/',2) AND p.user_id=auth.uid() AND b.status='in_progress')
$$;
REVOKE ALL ON FUNCTION public.can_upload_service_evidence(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_upload_service_evidence(text) TO authenticated;
ALTER POLICY "service evidence upload" ON storage.objects WITH CHECK(bucket_id='service-evidence' AND public.can_upload_service_evidence(name));
