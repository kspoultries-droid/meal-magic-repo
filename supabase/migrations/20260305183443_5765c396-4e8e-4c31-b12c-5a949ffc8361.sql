
-- Drop old restrictive SELECT policies
DROP POLICY IF EXISTS "Anyone can view active restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Public view active restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Anyone can view active grocery stores" ON public.grocery_stores;

-- Create new policies that allow viewing ALL stores (active + inactive)
CREATE POLICY "Anyone can view all restaurants" ON public.restaurants FOR SELECT USING (true);
CREATE POLICY "Anyone can view all grocery stores" ON public.grocery_stores FOR SELECT USING (true);
