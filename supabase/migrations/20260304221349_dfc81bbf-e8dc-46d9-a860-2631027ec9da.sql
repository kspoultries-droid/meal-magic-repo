ALTER TABLE public.grocery_stores ADD COLUMN IF NOT EXISTS opening_time text DEFAULT '08:00';
ALTER TABLE public.grocery_stores ADD COLUMN IF NOT EXISTS closing_time text DEFAULT '22:00';
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS opening_time text DEFAULT '08:00';
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS closing_time text DEFAULT '22:00';