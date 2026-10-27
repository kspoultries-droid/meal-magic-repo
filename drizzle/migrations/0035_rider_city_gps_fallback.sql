CREATE OR REPLACE FUNCTION public.fill_rider_city()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.city_id IS NULL THEN
    SELECT city_id INTO NEW.city_id FROM profiles WHERE id=NEW.id;
    IF NEW.city_id IS NULL THEN
      SELECT city_id INTO NEW.city_id FROM partner_applications
      WHERE user_id=NEW.id AND city_id IS NOT NULL ORDER BY created_at DESC LIMIT 1;
    END IF;
    -- Fallback: city of the nearest active restaurant to the rider's live GPS (within 40 km)
    IF NEW.city_id IS NULL AND NEW.current_lat IS NOT NULL AND NEW.current_lng IS NOT NULL THEN
      SELECT r.city_id INTO NEW.city_id FROM restaurants r
      WHERE r.city_id IS NOT NULL AND r.pickup_lat IS NOT NULL AND r.pickup_lng IS NOT NULL
        AND public.haversine_km(NEW.current_lat, NEW.current_lng, r.pickup_lat, r.pickup_lng) <= 40
      ORDER BY public.haversine_km(NEW.current_lat, NEW.current_lng, r.pickup_lat, r.pickup_lng) LIMIT 1;
    END IF;
  END IF;
  RETURN NEW;
END $function$;

UPDATE public.riders SET updated_at = now() WHERE city_id IS NULL AND current_lat IS NOT NULL;