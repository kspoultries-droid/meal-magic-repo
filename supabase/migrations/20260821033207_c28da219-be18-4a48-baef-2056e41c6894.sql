ALTER TABLE public.cities
  ADD COLUMN IF NOT EXISTS food_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS grocery_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS wholesale_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_hide_without_rider boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS default_courier text,
  ADD COLUMN IF NOT EXISTS courier_payment_default text NOT NULL DEFAULT 'cod',
  ADD COLUMN IF NOT EXISTS courier_advance_percent numeric NOT NULL DEFAULT 0;

ALTER TABLE public.grocery_cart_orders
  ADD COLUMN IF NOT EXISTS shipment_status text,
  ADD COLUMN IF NOT EXISTS courier_payment_type text NOT NULL DEFAULT 'cod',
  ADD COLUMN IF NOT EXISTS courier_tracking_url text,
  ADD COLUMN IF NOT EXISTS shipped_at timestamptz,
  ADD COLUMN IF NOT EXISTS courier_updated_at timestamptz;

CREATE OR REPLACE FUNCTION public.get_city_services()
RETURNS TABLE(
  id uuid, name text, delivery_fee numeric,
  food_enabled boolean, grocery_enabled boolean, wholesale_enabled boolean,
  rider_count integer,
  food_live boolean, grocery_live boolean, wholesale_live boolean,
  default_courier text, courier_payment_default text, courier_advance_percent numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.id, c.name, c.delivery_fee,
         c.food_enabled, c.grocery_enabled, c.wholesale_enabled,
         COALESCE(r.cnt, 0)::int AS rider_count,
         (c.food_enabled AND (NOT c.auto_hide_without_rider OR COALESCE(r.cnt,0) > 0)) AS food_live,
         (c.grocery_enabled AND (NOT c.auto_hide_without_rider OR COALESCE(r.cnt,0) > 0)) AS grocery_live,
         c.wholesale_enabled AS wholesale_live,
         c.default_courier, c.courier_payment_default, c.courier_advance_percent
  FROM public.cities c
  LEFT JOIN (
    SELECT city_id, COUNT(*) AS cnt FROM public.riders WHERE city_id IS NOT NULL GROUP BY city_id
  ) r ON r.city_id = c.id
  ORDER BY c.name;
$$;

REVOKE ALL ON FUNCTION public.get_city_services() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_city_services() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.sync_courier_shipment_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.shipment_status IS DISTINCT FROM OLD.shipment_status AND NEW.shipment_status IS NOT NULL THEN
    NEW.courier_updated_at := now();
    IF NEW.shipment_status = 'dispatched' THEN
      NEW.shipped_at := COALESCE(NEW.shipped_at, now());
      NEW.status := 'delivering';
    ELSIF NEW.shipment_status = 'in_transit' THEN
      NEW.status := 'delivering';
    ELSIF NEW.shipment_status = 'out_for_delivery' THEN
      NEW.status := 'delivering';
    ELSIF NEW.shipment_status = 'delivered' THEN
      NEW.status := 'delivered';
    ELSIF NEW.shipment_status = 'returned' THEN
      NEW.status := 'cancelled';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_courier_shipment ON public.grocery_cart_orders;
CREATE TRIGGER trg_sync_courier_shipment
BEFORE UPDATE ON public.grocery_cart_orders
FOR EACH ROW EXECUTE FUNCTION public.sync_courier_shipment_status();

ALTER TABLE public.grocery_cart_orders REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'grocery_cart_orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.grocery_cart_orders;
  END IF;
END $$;