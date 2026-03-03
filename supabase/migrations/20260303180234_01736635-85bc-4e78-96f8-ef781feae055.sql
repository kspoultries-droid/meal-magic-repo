
ALTER TABLE public.grocery_products 
ADD COLUMN discount_price numeric NULL,
ADD COLUMN is_special_offer boolean DEFAULT false;
