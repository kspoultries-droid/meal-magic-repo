ALTER TABLE public.grocery_stores 
ADD COLUMN IF NOT EXISTS banner_theme text DEFAULT 'green',
ADD COLUMN IF NOT EXISTS name_color text DEFAULT '#ffffff',
ADD COLUMN IF NOT EXISTS name_style text DEFAULT 'bold';