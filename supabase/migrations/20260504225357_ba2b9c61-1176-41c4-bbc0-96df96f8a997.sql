CREATE TABLE public.wholesale_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ur TEXT,
  icon TEXT NOT NULL DEFAULT 'Package',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wholesale_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone view active wholesale categories"
ON public.wholesale_categories FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage wholesale categories"
ON public.wholesale_categories FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.wholesale_categories (name, name_ur, icon, sort_order) VALUES
  ('All', 'سب', 'Package', 0),
  ('Toys', 'کھلونے', 'ToyBrick', 10),
  ('Children Clothes', 'بچوں کے کپڑے', 'Shirt', 20),
  ('Electronics', 'الیکٹرانکس', 'Cpu', 30),
  ('Pansaar', 'پنساری', 'Wheat', 40),
  ('General', 'جنرل', 'ShoppingBag', 50);