ALTER POLICY "Read approved or own reels videos"
ON storage.objects TO authenticated
USING (
  bucket_id = 'reels'
  AND (
    owner_id = (SELECT auth.uid()::text)
    OR (owner_id IS NULL AND (storage.foldername(name))[1] = (SELECT auth.uid()::text))
  )
);

CREATE POLICY "Admins read reels videos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'reels' AND public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Public read exact approved reel assets"
ON storage.objects FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'reels'
  AND EXISTS (
    SELECT 1 FROM public.reels AS r
    WHERE r.is_active = true
      AND r.moderation_status = 'approved'
      AND split_part(r.video_url, '?', 1) ~ '^https://[^/]+/storage/v1/object/(public|sign|authenticated)/reels/'
      AND regexp_replace(
        split_part(r.video_url, '?', 1),
        '^https://[^/]+/storage/v1/object/(public|sign|authenticated)/reels/',
        ''
      ) = storage.objects.name
  )
);