DROP VIEW IF EXISTS public.grocery_reviews_public;

-- Everyone signed in may read public review content, but not the reviewer's identity
CREATE POLICY "Signed in users read public grocery review content"
ON public.grocery_reviews
FOR SELECT
TO authenticated
USING (true);

REVOKE SELECT ON public.grocery_reviews FROM authenticated;
GRANT SELECT (id, order_id, store_id, rating, comment, reply, replied_at, created_at, updated_at, photo_urls, video_url)
ON public.grocery_reviews TO authenticated;