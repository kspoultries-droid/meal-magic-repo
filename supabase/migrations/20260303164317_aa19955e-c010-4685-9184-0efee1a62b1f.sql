
-- Grocery stores table
CREATE TABLE public.grocery_stores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  city_id UUID REFERENCES public.cities(id),
  owner_id UUID NOT NULL,
  is_active BOOLEAN DEFAULT true,
  delivery_time TEXT DEFAULT '20-30 min',
  rating NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.grocery_stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active grocery stores" ON public.grocery_stores FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage all grocery stores" ON public.grocery_stores FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owners manage own grocery stores" ON public.grocery_stores FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- Grocery products table
CREATE TABLE public.grocery_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.grocery_stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'General',
  price NUMERIC NOT NULL,
  unit TEXT DEFAULT 'kg',
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.grocery_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view available grocery products" ON public.grocery_products FOR SELECT USING (is_available = true);
CREATE POLICY "Admins manage all grocery products" ON public.grocery_products FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Store owners manage own products" ON public.grocery_products FOR ALL USING (
  EXISTS (SELECT 1 FROM public.grocery_stores WHERE id = grocery_products.store_id AND owner_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.grocery_stores WHERE id = grocery_products.store_id AND owner_id = auth.uid())
);
