
-- Drop and recreate orders -> restaurants FK with CASCADE
ALTER TABLE public.orders DROP CONSTRAINT orders_restaurant_id_fkey;
ALTER TABLE public.orders ADD CONSTRAINT orders_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

-- Drop and recreate order_items -> orders FK with CASCADE
ALTER TABLE public.order_items DROP CONSTRAINT order_items_order_id_fkey;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

-- Drop and recreate menu_items -> restaurants FK with CASCADE
ALTER TABLE public.menu_items DROP CONSTRAINT menu_items_restaurant_id_fkey;
ALTER TABLE public.menu_items ADD CONSTRAINT menu_items_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

-- Drop and recreate restaurants -> cities FK with CASCADE
ALTER TABLE public.restaurants DROP CONSTRAINT restaurants_city_id_fkey;
ALTER TABLE public.restaurants ADD CONSTRAINT restaurants_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id) ON DELETE CASCADE;
