ALTER TABLE public.catalog_items
  ADD COLUMN IF NOT EXISTS images text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'admin';
ALTER TABLE public.grocery_products ADD COLUMN IF NOT EXISTS barcode text;

CREATE TABLE public.catalog_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL UNIQUE REFERENCES public.grocery_products(id) ON DELETE CASCADE,
  store_id uuid NOT NULL,
  submitted_by uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  name_ur text,
  brand text,
  category text NOT NULL DEFAULT 'General',
  unit text,
  barcode text,
  description text,
  specs jsonb NOT NULL DEFAULT '{}'::jsonb,
  images text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  review_note text,
  catalog_item_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
GRANT SELECT, INSERT ON public.catalog_suggestions TO authenticated;
GRANT ALL ON public.catalog_suggestions TO service_role;
ALTER TABLE public.catalog_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners suggest own products" ON public.catalog_suggestions FOR INSERT TO authenticated
  WITH CHECK (submitted_by = auth.uid() AND status = 'pending' AND EXISTS (
    SELECT 1 FROM public.grocery_products gp JOIN public.grocery_stores gs ON gs.id = gp.store_id
    WHERE gp.id = product_id AND gs.id = store_id AND gs.owner_id = auth.uid()));
CREATE POLICY "Owners and admins read suggestions" ON public.catalog_suggestions FOR SELECT TO authenticated
  USING (submitted_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.review_catalog_suggestion(_id uuid, _approve boolean, _verify_photo boolean DEFAULT false, _note text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.catalog_suggestions; new_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'صرف ایڈمن'; END IF;
  SELECT * INTO s FROM public.catalog_suggestions WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'تجویز نہیں ملی'; END IF;
  IF s.status <> 'pending' THEN RAISE EXCEPTION 'اس تجویز کا فیصلہ ہو چکا ہے'; END IF;
  IF NOT _approve THEN
    UPDATE public.catalog_suggestions SET status='rejected', review_note=_note, reviewed_at=now() WHERE id=_id;
    RETURN NULL;
  END IF;
  IF _verify_photo AND coalesce(array_length(s.images,1),0) = 0 THEN RAISE EXCEPTION 'تصدیق کے لیے تصویر لازمی ہے'; END IF;
  IF nullif(trim(s.barcode),'') IS NOT NULL THEN
    SELECT id INTO new_id FROM public.catalog_items WHERE barcode = trim(s.barcode);
  END IF;
  IF new_id IS NULL THEN
    INSERT INTO public.catalog_items(name, name_ur, brand, category, unit, barcode, description, specs, images, image_url, image_verified, source)
    VALUES (s.name, s.name_ur, s.brand, s.category, s.unit, nullif(trim(s.barcode),''), s.description, s.specs, s.images, s.images[1], _verify_photo, 'vendor')
    RETURNING id INTO new_id;
  END IF;
  UPDATE public.catalog_suggestions SET status='approved', review_note=_note, reviewed_at=now(), catalog_item_id=new_id WHERE id=_id;
  UPDATE public.grocery_products SET catalog_item_id = new_id WHERE id = s.product_id;
  RETURN new_id;
END $$;
REVOKE ALL ON FUNCTION public.review_catalog_suggestion(uuid, boolean, boolean, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.review_catalog_suggestion(uuid, boolean, boolean, text) TO authenticated;