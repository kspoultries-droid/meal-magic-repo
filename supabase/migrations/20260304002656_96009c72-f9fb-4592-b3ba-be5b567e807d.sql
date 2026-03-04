
-- Add bill image URL for shopkeeper to upload receipt/bill
ALTER TABLE public.grocery_list_orders ADD COLUMN bill_image_url text;

-- Add alternatives note for shopkeeper to suggest replacements
ALTER TABLE public.grocery_list_orders ADD COLUMN alternatives_note text;
