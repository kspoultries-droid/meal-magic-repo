
-- Ad placement packages
CREATE TABLE public.ad_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  placements text[] NOT NULL DEFAULT '{}', -- e.g. {'home','grocery','restaurant','checkout'}
  price_per_day numeric NOT NULL DEFAULT 0,
  price_per_week numeric NOT NULL DEFAULT 0,
  price_per_month numeric NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Promotional ads
CREATE TABLE public.promotional_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  brand_name text NOT NULL,
  image_url text,
  link_url text,
  placements text[] NOT NULL DEFAULT '{home}', -- where to show: home, grocery, restaurant, checkout
  package_id uuid REFERENCES public.ad_packages(id) ON DELETE SET NULL,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  is_active boolean DEFAULT true,
  payment_status text DEFAULT 'pending', -- pending, paid, expired
  payment_amount numeric DEFAULT 0,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.ad_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotional_ads ENABLE ROW LEVEL SECURITY;

-- Anyone can view active ads
CREATE POLICY "Anyone can view active ads" ON public.promotional_ads
  FOR SELECT USING (is_active = true AND CURRENT_DATE BETWEEN start_date AND end_date);

-- Admins manage all ads
CREATE POLICY "Admins manage all ads" ON public.promotional_ads
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view active packages
CREATE POLICY "Anyone can view active packages" ON public.ad_packages
  FOR SELECT USING (is_active = true);

-- Admins manage packages
CREATE POLICY "Admins manage packages" ON public.ad_packages
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_promotional_ads_updated_at
  BEFORE UPDATE ON public.promotional_ads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default packages
INSERT INTO public.ad_packages (name, description, placements, price_per_day, price_per_week, price_per_month) VALUES
  ('Basic - صرف ہوم پیج', 'ہوم پیج پر بینر ایڈ', '{home}', 500, 2500, 8000),
  ('Standard - 2 جگہیں', 'ہوم پیج + گروسری یا ریسٹورنٹ لسٹ', '{home,grocery}', 800, 4000, 14000),
  ('Premium - 3 جگہیں', 'ہوم، گروسری، اور ریسٹورنٹ لسٹ', '{home,grocery,restaurant}', 1200, 6000, 20000),
  ('Ultimate - سب جگہ', 'تمام 4 جگہوں پر ایڈ ڈسپلے', '{home,grocery,restaurant,checkout}', 2000, 10000, 35000);
