CREATE OR REPLACE FUNCTION public.reject_far_food_delivery_pin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE plat double precision; plng double precision;
BEGIN
  IF NEW.delivery_lat IS NULL OR NEW.delivery_lng IS NULL THEN RETURN NEW; END IF;
  SELECT pickup_lat,pickup_lng INTO plat,plng FROM restaurants WHERE id=NEW.restaurant_id;
  IF plat IS NOT NULL AND plng IS NOT NULL AND haversine_km(NEW.delivery_lat,NEW.delivery_lng,plat,plng) > 30 THEN
    NEW.delivery_lat := NULL; NEW.delivery_lng := NULL;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_reject_far_food_delivery_pin ON public.orders;
CREATE TRIGGER trg_reject_far_food_delivery_pin BEFORE INSERT OR UPDATE OF delivery_lat, delivery_lng ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.reject_far_food_delivery_pin();