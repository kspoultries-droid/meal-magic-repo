
-- Add CASCADE on menu_items -> restaurants foreign key so deleting a restaurant also deletes its menu items
ALTER TABLE public.menu_items DROP CONSTRAINT menu_items_restaurant_id_fkey;
ALTER TABLE public.menu_items ADD CONSTRAINT menu_items_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;
