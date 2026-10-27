ALTER TABLE public.promotional_ads
  ADD COLUMN IF NOT EXISTS ad_type text NOT NULL DEFAULT 'banner',
  ADD COLUMN IF NOT EXISTS subtitle text,
  ADD COLUMN IF NOT EXISTS cta_text text,
  ADD COLUMN IF NOT EXISTS offer_badge text,
  ADD COLUMN IF NOT EXISTS promo_code text,
  ADD COLUMN IF NOT EXISTS price numeric,
  ADD COLUMN IF NOT EXISTS original_price numeric,
  ADD COLUMN IF NOT EXISTS show_text boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS impressions integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicks integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.track_ad_event(_ad_id uuid, _kind text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.promotional_ads
     SET impressions = impressions + CASE WHEN _kind = 'view' THEN 1 ELSE 0 END,
         clicks = clicks + CASE WHEN _kind = 'click' THEN 1 ELSE 0 END
   WHERE id = _ad_id AND is_active = true;
$$;
GRANT EXECUTE ON FUNCTION public.track_ad_event(uuid, text) TO anon, authenticated;