
-- Add sort_order column to grocery_products for product positioning
ALTER TABLE public.grocery_products ADD COLUMN sort_order integer DEFAULT 0;

-- Set initial sort order based on current order
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY store_id ORDER BY category, name) as rn
  FROM public.grocery_products
)
UPDATE public.grocery_products SET sort_order = ranked.rn
FROM ranked WHERE grocery_products.id = ranked.id;
