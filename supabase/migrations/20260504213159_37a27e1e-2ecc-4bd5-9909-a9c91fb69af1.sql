-- Add wholesale support to grocery_stores
ALTER TABLE public.grocery_stores 
  ADD COLUMN IF NOT EXISTS store_type text NOT NULL DEFAULT 'retail',
  ADD COLUMN IF NOT EXISTS ships_nationwide boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS courier_partners text;

-- Add wholesale fields to grocery_products
ALTER TABLE public.grocery_products
  ADD COLUMN IF NOT EXISTS wholesale_price numeric,
  ADD COLUMN IF NOT EXISTS min_order_qty integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS bulk_tier_qty integer,
  ADD COLUMN IF NOT EXISTS bulk_tier_price numeric;

-- Add wholesale fields to grocery_cart_orders for shipping
ALTER TABLE public.grocery_cart_orders
  ADD COLUMN IF NOT EXISTS delivery_method text NOT NULL DEFAULT 'local_rider',
  ADD COLUMN IF NOT EXISTS courier_name text,
  ADD COLUMN IF NOT EXISTS tracking_number text;

CREATE INDEX IF NOT EXISTS idx_grocery_stores_store_type ON public.grocery_stores(store_type);
