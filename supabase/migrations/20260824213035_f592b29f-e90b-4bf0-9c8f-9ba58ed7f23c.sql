ALTER TABLE public.reels
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'approved' CHECK (moderation_status IN ('pending','approved','rejected')),
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

CREATE INDEX IF NOT EXISTS reels_owner_idx ON public.reels(owner_id);
CREATE INDEX IF NOT EXISTS reels_moderation_idx ON public.reels(moderation_status);

-- helper: does user own the source entity of a reel?
CREATE OR REPLACE FUNCTION public.owns_reel_source(_user_id uuid, _source_type text, _source_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN _source_id IS NULL THEN false
    WHEN _source_type = 'restaurant' THEN EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = _source_id AND r.owner_id = _user_id)
    ELSE EXISTS (SELECT 1 FROM public.grocery_stores s WHERE s.id = _source_id AND s.owner_id = _user_id)
  END;
$$;
REVOKE ALL ON FUNCTION public.owns_reel_source(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owns_reel_source(uuid, text, uuid) TO authenticated;

-- public visibility now requires approval
DROP POLICY IF EXISTS "Public can view active reels" ON public.reels;
CREATE POLICY "Public can view approved reels"
ON public.reels FOR SELECT TO anon, authenticated
USING (is_active = true AND moderation_status = 'approved');

DROP POLICY IF EXISTS "Owners view own reels" ON public.reels;
CREATE POLICY "Owners view own reels"
ON public.reels FOR SELECT TO authenticated
USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners create own reels" ON public.reels;
CREATE POLICY "Owners create own reels"
ON public.reels FOR INSERT TO authenticated
WITH CHECK (
  owner_id = auth.uid()
  AND public.owns_reel_source(auth.uid(), source_type, source_id)
  AND moderation_status = 'pending'
);

DROP POLICY IF EXISTS "Owners delete own reels" ON public.reels;
CREATE POLICY "Owners delete own reels"
ON public.reels FOR DELETE TO authenticated
USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners update own reels" ON public.reels;
CREATE POLICY "Owners update own reels"
ON public.reels FOR UPDATE TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- prevent non-admin owners from self-approving or inflating counters
CREATE OR REPLACE FUNCTION public.protect_reel_moderation()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  NEW.moderation_status := OLD.moderation_status;
  NEW.rejection_reason := OLD.rejection_reason;
  NEW.reviewed_by := OLD.reviewed_by;
  NEW.reviewed_at := OLD.reviewed_at;
  NEW.views := OLD.views;
  NEW.likes := OLD.likes;
  NEW.owner_id := OLD.owner_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_reel_moderation_trg ON public.reels;
CREATE TRIGGER protect_reel_moderation_trg
BEFORE UPDATE ON public.reels
FOR EACH ROW EXECUTE FUNCTION public.protect_reel_moderation();

-- vendors may upload their own reel videos
DROP POLICY IF EXISTS "Vendors upload reels videos" ON storage.objects;
CREATE POLICY "Vendors upload reels videos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'reels'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'restaurant_owner')
    OR EXISTS (SELECT 1 FROM public.grocery_stores s WHERE s.owner_id = auth.uid())
  )
);