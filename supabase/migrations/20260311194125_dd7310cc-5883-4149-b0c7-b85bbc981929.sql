
-- Service providers table: workers/helpers linked to categories with location
CREATE TABLE public.service_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  category_id UUID REFERENCES public.service_categories(id) ON DELETE CASCADE,
  city_id UUID REFERENCES public.cities(id),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  address TEXT,
  rating NUMERIC DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  bio TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;

-- Anyone can view active providers
CREATE POLICY "Anyone view active providers"
ON public.service_providers FOR SELECT
USING (is_active = true);

-- Admins manage all
CREATE POLICY "Admins manage providers"
ON public.service_providers FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Support view all
CREATE POLICY "Support view providers"
ON public.service_providers FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'support'));

-- Mechanics manage own provider profile
CREATE POLICY "Mechanics manage own profile"
ON public.service_providers FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Update service_reviews to also link to provider
ALTER TABLE public.service_reviews ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES public.service_providers(id);
