
-- Add receiver/gift delivery columns to orders
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS receiver_name text,
  ADD COLUMN IF NOT EXISTS receiver_phone text,
  ADD COLUMN IF NOT EXISTS is_gift boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_lat double precision,
  ADD COLUMN IF NOT EXISTS delivery_lng double precision;

-- Add same columns to grocery_list_orders
ALTER TABLE public.grocery_list_orders
  ADD COLUMN IF NOT EXISTS receiver_name text,
  ADD COLUMN IF NOT EXISTS receiver_phone text,
  ADD COLUMN IF NOT EXISTS is_gift boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_lat double precision,
  ADD COLUMN IF NOT EXISTS delivery_lng double precision;
