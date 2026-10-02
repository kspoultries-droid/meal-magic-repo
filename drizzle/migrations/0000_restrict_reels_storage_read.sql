DROP POLICY IF EXISTS "Public read reels videos" ON storage.objects;
CREATE POLICY "Read approved or own reels videos" ON storage.objects
FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'reels' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.reels r
      WHERE r.is_active = true AND r.moderation_status = 'approved'
        AND r.video_url LIKE '%/reels/' || storage.objects.name
    )
  )
);