
-- Table: which categories each service manager handles
CREATE TABLE public.service_manager_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category_id UUID NOT NULL REFERENCES public.service_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, category_id)
);

ALTER TABLE public.service_manager_categories ENABLE ROW LEVEL SECURITY;

-- Admins manage all assignments
CREATE POLICY "Admins manage manager categories"
ON public.service_manager_categories FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Managers view own assignments
CREATE POLICY "Managers view own categories"
ON public.service_manager_categories FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create a helper function to check if user manages a category
CREATE OR REPLACE FUNCTION public.manages_category(_user_id uuid, _category_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.service_manager_categories
    WHERE user_id = _user_id
      AND category_id = _category_id
  )
$$;

-- RLS: Service managers can view bookings for their categories
CREATE POLICY "Service managers view category bookings"
ON public.service_bookings FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'service_manager'::app_role)
  AND manages_category(auth.uid(), (SELECT category_id FROM services WHERE id = service_bookings.service_id))
);

-- RLS: Service managers can update bookings for their categories
CREATE POLICY "Service managers update category bookings"
ON public.service_bookings FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'service_manager'::app_role)
  AND manages_category(auth.uid(), (SELECT category_id FROM services WHERE id = service_bookings.service_id))
);

-- RLS: Service managers can view providers in their categories
CREATE POLICY "Service managers view category providers"
ON public.service_providers FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'service_manager'::app_role)
  AND manages_category(auth.uid(), category_id)
);

-- RLS: Service managers can manage providers in their categories
CREATE POLICY "Service managers manage category providers"
ON public.service_providers FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'service_manager'::app_role)
  AND manages_category(auth.uid(), category_id)
)
WITH CHECK (
  has_role(auth.uid(), 'service_manager'::app_role)
  AND manages_category(auth.uid(), category_id)
);

-- RLS: Service managers can update services (pricing) in their categories
CREATE POLICY "Service managers update category services"
ON public.services FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'service_manager'::app_role)
  AND manages_category(auth.uid(), category_id)
);

-- RLS: Service managers can view service reviews for their categories
CREATE POLICY "Service managers view category reviews"
ON public.service_reviews FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'service_manager'::app_role)
  AND manages_category(auth.uid(), (SELECT category_id FROM services WHERE id = service_reviews.service_id))
);

-- Service managers can view services in their categories
CREATE POLICY "Service managers view category services"
ON public.services FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'service_manager'::app_role)
  AND manages_category(auth.uid(), category_id)
);

-- Service managers can view profiles (for customer/mechanic info)
CREATE POLICY "Service managers view profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'service_manager'::app_role));
