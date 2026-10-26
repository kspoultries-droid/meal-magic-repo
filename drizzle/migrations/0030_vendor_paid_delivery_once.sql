CREATE OR REPLACE FUNCTION public.apply_delivery_fee_payer()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_vendor_pays boolean := false;
BEGIN
  IF TG_OP = 'UPDATE' AND (OLD.delivery_fee_payer = 'vendor'
     OR (NEW.total_amount IS NOT DISTINCT FROM OLD.total_amount AND NEW.delivery_fee IS NOT DISTINCT FROM OLD.delivery_fee)) THEN
    RETURN NEW;
  END IF;
  IF TG_TABLE_NAME = 'orders' THEN
    SELECT COALESCE(pays_delivery_fee,false) INTO v_vendor_pays FROM public.restaurants WHERE id = NEW.restaurant_id;
  ELSE
    SELECT COALESCE(pays_delivery_fee,false) INTO v_vendor_pays FROM public.grocery_stores WHERE id = NEW.store_id;
  END IF;
  IF v_vendor_pays AND COALESCE(NEW.delivery_fee,0) > 0 THEN
    NEW.delivery_fee_payer := 'vendor';
    NEW.total_amount := GREATEST(0, COALESCE(NEW.total_amount,0) - COALESCE(NEW.delivery_fee,0));
  END IF;
  RETURN NEW;
END; $function$;