
ALTER TABLE public.grocery_stores ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- Generate slugs from existing store names
UPDATE public.grocery_stores 
SET slug = lower(replace(replace(replace(trim(name), ' ', '-'), '''', ''), '"', ''))
WHERE slug IS NULL;
