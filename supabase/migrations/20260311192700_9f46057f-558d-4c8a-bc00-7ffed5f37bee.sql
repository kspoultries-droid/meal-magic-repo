
-- Create grocery cart orders table
CREATE TABLE public.grocery_cart_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.grocery_stores(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  delivery_address TEXT,
  delivery_lat DOUBLE PRECISION,
  delivery_lng DOUBLE PRECISION,
  notes TEXT,
  payment_method TEXT DEFAULT 'cod',
  status TEXT NOT NULL DEFAULT 'pending',
  is_gift BOOLEAN DEFAULT false,
  receiver_name TEXT,
  receiver_phone TEXT,
  city_id UUID REFERENCES public.cities(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.grocery_cart_orders ENABLE ROW LEVEL SECURITY;

-- Customers create their own orders
CREATE POLICY "Customers create grocery cart orders"
ON public.grocery_cart_orders FOR INSERT
WITH CHECK (auth.uid() = customer_id);

-- Customers view own orders
CREATE POLICY "Customers view own grocery cart orders"
ON public.grocery_cart_orders FOR SELECT
USING (auth.uid() = customer_id);

-- Store owners manage orders for their stores
CREATE POLICY "Store owners manage grocery cart orders"
ON public.grocery_cart_orders FOR ALL
USING (EXISTS (SELECT 1 FROM grocery_stores WHERE grocery_stores.id = grocery_cart_orders.store_id AND grocery_stores.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM grocery_stores WHERE grocery_stores.id = grocery_cart_orders.store_id AND grocery_stores.owner_id = auth.uid()));

-- Admins manage all
CREATE POLICY "Admins manage grocery cart orders"
ON public.grocery_cart_orders FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Support view
CREATE POLICY "Support view grocery cart orders"
ON public.grocery_cart_orders FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'support'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.grocery_cart_orders;
