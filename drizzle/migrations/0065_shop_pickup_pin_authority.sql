DO $patch$ DECLARE def text; BEGIN
 SELECT pg_get_functiondef(p.oid) INTO def FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='rider_delivery_action';
 def:=replace(def,'ELSIF _kind=''food'' THEN SELECT pickup_lat,pickup_lng INTO destlat,destlng FROM restaurants WHERE id=o.restaurant_id; END IF;','ELSIF _kind=''food'' THEN SELECT pickup_lat,pickup_lng INTO destlat,destlng FROM restaurants WHERE id=o.restaurant_id; ELSE SELECT pickup_lat,pickup_lng INTO destlat,destlng FROM grocery_stores WHERE id=o.store_id; END IF;');
 EXECUTE def;
END $patch$;