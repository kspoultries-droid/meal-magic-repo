-- Allow mechanics to view service bookings
CREATE POLICY "Mechanics view service bookings"
ON public.service_bookings
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'mechanic'::app_role));

-- Allow mechanics to update service bookings (accept, complete)
CREATE POLICY "Mechanics update service bookings"
ON public.service_bookings
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'mechanic'::app_role));

-- Allow mechanics to view services
CREATE POLICY "Mechanics view services"
ON public.services
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'mechanic'::app_role));

-- Allow mechanics to view service categories
CREATE POLICY "Mechanics view service categories"
ON public.service_categories
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'mechanic'::app_role));

-- Allow mechanics to view customer profiles for contact
CREATE POLICY "Mechanics view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'mechanic'::app_role));