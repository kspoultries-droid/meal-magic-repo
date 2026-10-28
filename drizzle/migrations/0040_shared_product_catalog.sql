CREATE TABLE public.catalog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  unit text,
  brand text,
  description text,
  image_url text,
  weight_kg numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX catalog_items_name_unit_key ON public.catalog_items (lower(name), coalesce(lower(unit), ''));
CREATE INDEX catalog_items_category_idx ON public.catalog_items (category);
GRANT SELECT ON public.catalog_items TO authenticated;
GRANT ALL ON public.catalog_items TO service_role;
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read catalog" ON public.catalog_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage catalog" ON public.catalog_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
GRANT INSERT, UPDATE, DELETE ON public.catalog_items TO authenticated;

INSERT INTO public.catalog_items (name, category, unit, brand, description, image_url, weight_kg)
SELECT DISTINCT ON (lower(name), coalesce(lower(unit), ''))
  name, coalesce(nullif(category, ''), 'General'), unit, brand, description, image_url, weight_kg
FROM public.grocery_products
ORDER BY lower(name), coalesce(lower(unit), ''), (image_url IS NULL), created_at DESC
ON CONFLICT DO NOTHING;