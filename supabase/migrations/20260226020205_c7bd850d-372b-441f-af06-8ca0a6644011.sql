
-- Role enum
CREATE TYPE public.app_role AS ENUM ('customer', 'restaurant_owner', 'rider', 'admin');

-- User roles table (separate from profiles as required)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Cities table
CREATE TABLE public.cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  delivery_fee NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  city_id UUID REFERENCES public.cities(id),
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Restaurants table
CREATE TABLE public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  city_id UUID REFERENCES public.cities(id) NOT NULL,
  cuisines TEXT[] DEFAULT '{}',
  rating NUMERIC(2,1) DEFAULT 0,
  delivery_time TEXT DEFAULT '30-45 min',
  is_active BOOLEAN DEFAULT true,
  commission_rate NUMERIC(4,2) DEFAULT 15.00,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- Menu items table
CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  image_url TEXT,
  category TEXT DEFAULT 'Main',
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES auth.users(id) NOT NULL,
  restaurant_id UUID REFERENCES public.restaurants(id) NOT NULL,
  rider_id UUID REFERENCES auth.users(id),
  city_id UUID REFERENCES public.cities(id) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','preparing','ready','picked_up','delivered','cancelled')),
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(10,2) DEFAULT 0,
  payment_method TEXT DEFAULT 'cod' CHECK (payment_method IN ('cod','jazzcash','easypaisa','card')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','refunded')),
  delivery_address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Order items table
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  menu_item_id UUID REFERENCES public.menu_items(id) NOT NULL,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price NUMERIC(10,2) NOT NULL
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Riders table (extra info)
CREATE TABLE public.riders (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  city_id UUID REFERENCES public.cities(id),
  is_available BOOLEAN DEFAULT false,
  total_earnings NUMERIC(10,2) DEFAULT 0,
  wallet_balance NUMERIC(10,2) DEFAULT 0,
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  -- Default role: customer
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON public.restaurants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_riders_updated_at BEFORE UPDATE ON public.riders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: check if user owns restaurant
CREATE OR REPLACE FUNCTION public.owns_restaurant(_user_id UUID, _restaurant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE id = _restaurant_id AND owner_id = _user_id
  )
$$;

-- RLS Policies

-- user_roles: users can read their own roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- cities: everyone can read
CREATE POLICY "Anyone can view cities" ON public.cities FOR SELECT USING (true);
CREATE POLICY "Admins manage cities" ON public.cities FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- restaurants: customers can view active restaurants
CREATE POLICY "Anyone can view active restaurants" ON public.restaurants FOR SELECT USING (is_active = true);
CREATE POLICY "Owners manage own restaurants" ON public.restaurants FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "Admins manage all restaurants" ON public.restaurants FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- menu_items: everyone can view available items
CREATE POLICY "Anyone can view available menu items" ON public.menu_items FOR SELECT USING (is_available = true);
CREATE POLICY "Owners manage own menu items" ON public.menu_items FOR ALL USING (public.owns_restaurant(auth.uid(), restaurant_id));
CREATE POLICY "Admins manage all menu items" ON public.menu_items FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- orders
CREATE POLICY "Customers view own orders" ON public.orders FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Customers create orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Restaurant owners view their orders" ON public.orders FOR SELECT USING (public.owns_restaurant(auth.uid(), restaurant_id));
CREATE POLICY "Restaurant owners update their orders" ON public.orders FOR UPDATE USING (public.owns_restaurant(auth.uid(), restaurant_id));
CREATE POLICY "Riders view assigned orders" ON public.orders FOR SELECT USING (auth.uid() = rider_id);
CREATE POLICY "Riders update assigned orders" ON public.orders FOR UPDATE USING (auth.uid() = rider_id);
CREATE POLICY "Admins manage all orders" ON public.orders FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- order_items
CREATE POLICY "Order participants view items" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND (customer_id = auth.uid() OR rider_id = auth.uid() OR public.owns_restaurant(auth.uid(), restaurant_id)))
);
CREATE POLICY "Customers create order items" ON public.order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND customer_id = auth.uid())
);
CREATE POLICY "Admins manage order items" ON public.order_items FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- riders
CREATE POLICY "Riders view own data" ON public.riders FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Riders update own data" ON public.riders FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Riders insert own data" ON public.riders FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins manage riders" ON public.riders FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Seed cities
INSERT INTO public.cities (name, delivery_fee) VALUES
  ('Karachi', 50), ('Lahore', 50), ('Islamabad', 60), ('Rawalpindi', 55), ('Faisalabad', 45), ('Multan', 45), ('Peshawar', 50);

-- Enable realtime for orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
