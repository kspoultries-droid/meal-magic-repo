
-- Allow everyone to view all services (active and inactive) so "Coming Soon" can show
DROP POLICY "Anyone can view active services" ON public.services;
CREATE POLICY "Anyone can view all services"
ON public.services
FOR SELECT
USING (true);
