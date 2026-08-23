CREATE TABLE public.reels (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('restaurant','grocery','wholesale')),
  source_id uuid,
  source_name text not null,
  title text not null,
  caption text,
  video_url text not null,
  poster_url text,
  price numeric,
  views integer not null default 0,
  likes integer not null default 0,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

GRANT SELECT ON public.reels TO anon;
GRANT SELECT ON public.reels TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reels TO authenticated;
GRANT ALL ON public.reels TO service_role;

ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active reels"
ON public.reels FOR SELECT TO anon, authenticated
USING (is_active = true);

CREATE POLICY "Admins manage reels"
ON public.reels FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.increment_reel_views(_reel_id uuid)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  UPDATE public.reels SET views = views + 1 WHERE id = _reel_id AND is_active = true;
$$;
REVOKE ALL ON FUNCTION public.increment_reel_views(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_reel_views(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.like_reel(_reel_id uuid)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  UPDATE public.reels SET likes = likes + 1 WHERE id = _reel_id AND is_active = true;
$$;
REVOKE ALL ON FUNCTION public.like_reel(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.like_reel(uuid) TO anon, authenticated;

CREATE POLICY "Public read reels videos"
ON storage.objects FOR SELECT USING (bucket_id = 'reels');
CREATE POLICY "Admins upload reels videos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'reels' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete reels videos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'reels' AND public.has_role(auth.uid(), 'admin'));

INSERT INTO public.reels (source_type, source_id, source_name, title, caption, video_url, poster_url, price, sort_order)
SELECT 'restaurant', r.id, r.name, 'آج کی سپیشل ڈیل', 'تازہ اور گرم — محدود وقت کے لیے آرڈر کریں', 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&h=1000&fit=crop', 350, 1
FROM public.restaurants r WHERE r.is_active = true ORDER BY r.created_at LIMIT 1;

INSERT INTO public.reels (source_type, source_id, source_name, title, caption, video_url, poster_url, price, sort_order)
SELECT 'grocery', s.id, s.name, 'تازہ گروسری آفر', 'روزانہ کی اشیاء مناسب قیمت پر', 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&h=1000&fit=crop', 199, 2
FROM public.grocery_stores s WHERE s.is_active = true AND s.store_type = 'retail' ORDER BY s.created_at LIMIT 1;

INSERT INTO public.reels (source_type, source_id, source_name, title, caption, video_url, poster_url, price, sort_order)
SELECT 'wholesale', s.id, s.name, 'ہول سیل بازار ڈیل', 'بلک میں خریدیں، زیادہ بچائیں — پورے پاکستان میں ڈیلیوری', 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&h=1000&fit=crop', 999, 3
FROM public.grocery_stores s WHERE s.is_active = true AND s.store_type = 'wholesale' ORDER BY s.created_at LIMIT 1;