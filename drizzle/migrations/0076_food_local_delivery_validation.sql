CREATE OR REPLACE FUNCTION public.food_delivery_block_reason(_restaurant_id uuid, _city_id uuid, _lat double precision, _lng double precision)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.restaurants%ROWTYPE; km double precision;
BEGIN
 SELECT * INTO r FROM public.restaurants WHERE id=_restaurant_id;
 IF NOT FOUND OR r.city_id IS NULL THEN RETURN 'ریسٹورنٹ کا شہر دستیاب نہیں'; END IF;
 IF _city_id IS DISTINCT FROM r.city_id THEN RETURN 'فوڈ ڈیلیوری صرف ریسٹورنٹ کے شہر میں دستیاب ہے'; END IF;
 IF _lat IS NULL OR _lng IS NULL OR NOT (_lat BETWEEN -90 AND 90 AND _lng BETWEEN -180 AND 180) THEN RETURN 'ڈیلیوری کے لیے نقشے پر درست مقام منتخب کریں'; END IF;
 IF r.pickup_lat IS NULL OR r.pickup_lng IS NULL OR NOT (r.pickup_lat BETWEEN -90 AND 90 AND r.pickup_lng BETWEEN -180 AND 180) THEN RETURN 'ریسٹورنٹ کا مقام تصدیق شدہ نہیں؛ فوڈ آرڈر فی الحال دستیاب نہیں'; END IF;
 km:=public.haversine_km(r.pickup_lat,r.pickup_lng,_lat,_lng);
 IF km>30 THEN RETURN 'یہ مقام ریسٹورنٹ کی مقامی فوڈ ڈیلیوری حد سے باہر ہے (30 کلومیٹر)'; END IF;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.food_delivery_block_reason(uuid,uuid,double precision,double precision) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.food_delivery_block_reason(uuid,uuid,double precision,double precision) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.reject_far_food_delivery_pin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE reason text;
BEGIN
 IF TG_OP='UPDATE' AND NEW.status IN ('cancelled','returned_to_store') AND NEW.rider_id IS NOT DISTINCT FROM OLD.rider_id THEN RETURN NEW; END IF;
 reason:=public.food_delivery_block_reason(NEW.restaurant_id,NEW.city_id,NEW.delivery_lat,NEW.delivery_lng);
 IF reason IS NOT NULL THEN RAISE EXCEPTION '%',reason; END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE TRIGGER trg_reject_far_food_delivery_pin BEFORE INSERT OR UPDATE OF restaurant_id,city_id,delivery_lat,delivery_lng,rider_id,status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.reject_far_food_delivery_pin();

CREATE OR REPLACE FUNCTION public.guard_food_offer_location()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.orders%ROWTYPE; reason text;
BEGIN
 IF NEW.order_kind<>'food' OR NEW.status NOT IN ('offered','accepted') THEN RETURN NEW; END IF;
 SELECT * INTO o FROM public.orders WHERE id=NEW.order_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'آرڈر موجود نہیں'; END IF;
 reason:=public.food_delivery_block_reason(o.restaurant_id,o.city_id,o.delivery_lat,o.delivery_lng);
 IF reason IS NOT NULL THEN RAISE EXCEPTION '%',reason; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a0_food_offer_location BEFORE INSERT OR UPDATE OF status,rider_id ON public.delivery_offers FOR EACH ROW EXECUTE FUNCTION public.guard_food_offer_location();

DO $$ DECLARE def text; BEGIN
 SELECT pg_get_functiondef(p.oid) INTO def FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='quote_delivery';
 IF position('BEGIN' in def)=0 THEN RAISE EXCEPTION 'quote_delivery anchor missing'; END IF;
 def:=replace(def,'BEGIN', E'BEGIN\n  IF _store_kind = ''food'' THEN\n    DECLARE reason text; BEGIN\n      reason := public.food_delivery_block_reason(_store_id,_city_id,_lat,_lng);\n      IF reason IS NOT NULL THEN RAISE EXCEPTION ''%'',reason; END IF;\n    END;\n  END IF;');
 EXECUTE def;
 SELECT pg_get_functiondef(p.oid) INTO def FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='delivery_dispatch_ready';
 IF position('WHERE o.id=_id AND o.status' in def)=0 THEN RAISE EXCEPTION 'dispatch readiness anchor missing'; END IF;
 def:=replace(def,'FROM orders o WHERE o.id=_id AND o.status','FROM orders o WHERE o.id=_id AND public.food_delivery_block_reason(o.restaurant_id,o.city_id,o.delivery_lat,o.delivery_lng) IS NULL AND o.status');
 EXECUTE def;
END $$;