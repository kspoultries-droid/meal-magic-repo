
-- Table for photo-based grocery list orders
CREATE TABLE public.grocery_list_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  store_id UUID NOT NULL REFERENCES public.grocery_stores(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  total_amount NUMERIC DEFAULT 0,
  delivery_address TEXT,
  payment_method TEXT DEFAULT 'cod',
  shopkeeper_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.grocery_list_orders ENABLE ROW LEVEL SECURITY;

-- Customers view own list orders
CREATE POLICY "Customers view own list orders"
ON public.grocery_list_orders FOR SELECT
USING (auth.uid() = customer_id);

-- Customers create list orders
CREATE POLICY "Customers create list orders"
ON public.grocery_list_orders FOR INSERT
WITH CHECK (auth.uid() = customer_id);

-- Store owners view & manage their store's list orders
CREATE POLICY "Store owners manage list orders"
ON public.grocery_list_orders FOR ALL
USING (EXISTS (
  SELECT 1 FROM grocery_stores WHERE id = grocery_list_orders.store_id AND owner_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM grocery_stores WHERE id = grocery_list_orders.store_id AND owner_id = auth.uid()
));

-- Admins manage all
CREATE POLICY "Admins manage list orders"
ON public.grocery_list_orders FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_grocery_list_orders_updated_at
BEFORE UPDATE ON public.grocery_list_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
