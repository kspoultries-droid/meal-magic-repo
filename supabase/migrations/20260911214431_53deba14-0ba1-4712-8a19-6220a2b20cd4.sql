
CREATE OR REPLACE FUNCTION public.commission_on_grocery_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_owner uuid; v_type text; v_sector text;
BEGIN
  IF NEW.status IN ('delivered','completed') AND COALESCE(OLD.status,'') NOT IN ('delivered','completed') THEN
    SELECT owner_id, store_type INTO v_owner, v_type FROM public.grocery_stores WHERE id = NEW.store_id;
    v_sector := CASE WHEN v_type = 'wholesale' THEN 'wholesale' ELSE 'grocery' END;
    PERFORM public.record_commission(v_sector, NEW.id, v_owner, NEW.city_id, v_sector,
      COALESCE(NEW.final_amount, NEW.total_amount)::numeric, COALESCE(NEW.delivery_fee,0)::numeric,
      'easylife'::text, false);
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.commission_on_service_booking()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_vendor uuid;
BEGIN
  IF NEW.status IN ('completed','delivered') AND COALESCE(OLD.status,'') NOT IN ('completed','delivered') THEN
    SELECT sp.user_id INTO v_vendor FROM public.service_providers sp WHERE sp.id = NEW.provider_id;
    PERFORM public.record_commission('service', NEW.id, v_vendor, NEW.city_id, 'service',
      NEW.total_amount::numeric, 0::numeric, 'easylife'::text, false);
  END IF;
  RETURN NEW;
END; $function$;

DROP FUNCTION IF EXISTS public.record_commission(text,uuid,uuid,uuid,text,numeric,numeric,text);
