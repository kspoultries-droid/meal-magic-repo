ALTER TABLE public.grocery_stores ADD COLUMN IF NOT EXISTS pickup_lat double precision;
ALTER TABLE public.grocery_stores ADD COLUMN IF NOT EXISTS pickup_lng double precision;
ALTER TABLE public.grocery_stores ADD COLUMN IF NOT EXISTS free_delivery_above numeric;
ALTER TABLE public.grocery_cart_orders ADD COLUMN IF NOT EXISTS delivery_policy_snapshot jsonb;
ALTER TABLE public.grocery_cart_orders ADD COLUMN IF NOT EXISTS shipping_cost numeric NOT NULL DEFAULT 0;
ALTER TABLE public.grocery_cart_orders ADD COLUMN IF NOT EXISTS customer_delivery_fee numeric NOT NULL DEFAULT 0;
UPDATE public.grocery_cart_orders SET shipping_cost=coalesce(delivery_fee,0), customer_delivery_fee=CASE WHEN delivery_fee_payer='vendor' THEN 0 ELSE coalesce(delivery_fee,0) END;
CREATE OR REPLACE FUNCTION public.guard_shop_settings() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.free_delivery_above IS NOT NULL AND NEW.free_delivery_above<=0 THEN RAISE EXCEPTION 'Free delivery threshold must be positive'; END IF;
 IF (NEW.pickup_lat IS NULL)<>(NEW.pickup_lng IS NULL) OR NEW.pickup_lat NOT BETWEEN -90 AND 90 OR NEW.pickup_lng NOT BETWEEN -180 AND 180 THEN RAISE EXCEPTION 'Invalid shop location'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_guard_shop_settings BEFORE INSERT OR UPDATE ON public.grocery_stores FOR EACH ROW EXECUTE FUNCTION public.guard_shop_settings();
CREATE OR REPLACE FUNCTION public.save_shop_order_settings(_store_id uuid,_auto_accept boolean,_pays_delivery boolean,_free_above numeric,_lat double precision,_lng double precision) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.grocery_stores WHERE id=_store_id AND owner_id=auth.uid()) AND NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Only owner can change shop settings'; END IF;
 UPDATE public.grocery_stores SET auto_accept_orders=_auto_accept,pays_delivery_fee=_pays_delivery,free_delivery_above=_free_above,pickup_lat=_lat,pickup_lng=_lng WHERE id=_store_id;
END $$;
DO $patch$ DECLARE def text; BEGIN
 SELECT pg_get_functiondef(p.oid) INTO def FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='quote_delivery';
 def:=replace(def,'SELECT NULL::double precision, NULL::double precision, city_id, ships_nationwide','SELECT pickup_lat, pickup_lng, city_id, ships_nationwide');
 def:=replace(def,'v_fee := v_card.base_fee + v_distance_fee + COALESCE(v_slab_fee, 0);','v_fee := v_card.base_fee + v_distance_fee + CASE WHEN v_mode = ''loader'' THEN 0 ELSE COALESCE(v_slab_fee, 0) END;');
 EXECUTE def;
 SELECT pg_get_functiondef(p.oid) INTO def FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_delivery_route_context';
 def:=replace(def,'NULL::double precision pickup_lat,NULL::double precision pickup_lng','s.pickup_lat,s.pickup_lng'); EXECUTE def;
END $patch$;
CREATE OR REPLACE FUNCTION public.shop_delivery_quote(_store_id uuid,_city_id uuid,_lat double precision,_lng double precision,_weight_kg numeric,_subtotal numeric) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.grocery_stores%ROWTYPE; q jsonb; fee numeric; vendor boolean;
BEGIN
 SELECT * INTO s FROM public.grocery_stores WHERE id=_store_id;
 IF s.id IS NULL OR NOT s.is_active THEN RAISE EXCEPTION 'Shop is not accepting orders'; END IF;
 IF _subtotal<0 OR _weight_kg<=0 OR _lat NOT BETWEEN -90 AND 90 OR _lng NOT BETWEEN -180 AND 180 THEN RAISE EXCEPTION 'Invalid delivery request'; END IF;
 q:=public.quote_delivery(s.store_type,s.id,_city_id,_lat,_lng,_weight_kg,_subtotal);
 IF _city_id IS DISTINCT FROM s.city_id AND NOT (s.store_type='wholesale' AND s.ships_nationwide) THEN RAISE EXCEPTION 'Shop does not deliver to this city'; END IF;
 IF q->>'mode' IN ('rider','loader') AND (s.pickup_lat IS NULL OR s.pickup_lng IS NULL OR _lat IS NULL OR _lng IS NULL) THEN RAISE EXCEPTION 'Shop and delivery location pins are required'; END IF;
 IF q->>'mode'='courier' AND NOT s.ships_nationwide THEN RAISE EXCEPTION 'Courier unavailable'; END IF;
 fee:=coalesce((q->>'fee')::numeric,0);
 vendor:=q->>'mode'='rider' AND (s.pays_delivery_fee OR s.free_delivery_above IS NOT NULL AND _subtotal>=s.free_delivery_above);
 RETURN q||jsonb_build_object('shipping_cost',fee,'customer_fee',CASE WHEN vendor THEN 0 ELSE fee END,'fee_payer',CASE WHEN vendor THEN 'vendor' ELSE 'customer' END,'policy',jsonb_build_object('pays_delivery_fee',s.pays_delivery_fee,'free_delivery_above',s.free_delivery_above,'mode',q->>'mode','eligible_subtotal',_subtotal));
END $$;
DO $patch$ DECLARE def text; BEGIN
 SELECT pg_get_functiondef(p.oid) INTO def FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='apply_delivery_fee_payer';
 def:=replace(def,'BEGIN','BEGIN'||chr(10)||' IF TG_TABLE_NAME=''grocery_cart_orders'' AND NEW.delivery_policy_snapshot IS NOT NULL THEN RETURN NEW; END IF;'||chr(10)); EXECUTE def;
 SELECT pg_get_functiondef(p.oid) INTO def FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='grocery_recalc_order';
 def:=replace(def,'_sum + COALESCE(_o.delivery_fee,0)','_sum + CASE WHEN _o.delivery_fee_payer=''vendor'' THEN 0 ELSE COALESCE(_o.delivery_fee,0) END'); EXECUTE def;
 SELECT pg_get_functiondef(p.oid) INTO def FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='commission_on_grocery_order';
 def:=replace(def,'''easylife''::text, false','''easylife''::text, NEW.delivery_fee_payer=''vendor'''); EXECUTE def;
END $patch$;
CREATE OR REPLACE FUNCTION public.guard_shop_financial_snapshot() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF coalesce(current_setting('app.bypass_order_guard',true),'')<>'on' AND (NEW.delivery_policy_snapshot IS DISTINCT FROM OLD.delivery_policy_snapshot OR NEW.shipping_cost IS DISTINCT FROM OLD.shipping_cost OR NEW.customer_delivery_fee IS DISTINCT FROM OLD.customer_delivery_fee OR NEW.final_amount IS DISTINCT FROM OLD.final_amount) THEN RAISE EXCEPTION 'Shop financial snapshot is server managed'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER aa_guard_shop_financial_snapshot BEFORE UPDATE ON public.grocery_cart_orders FOR EACH ROW EXECUTE FUNCTION public.guard_shop_financial_snapshot();
REVOKE ALL ON FUNCTION public.save_shop_order_settings(uuid,boolean,boolean,numeric,double precision,double precision),public.shop_delivery_quote(uuid,uuid,double precision,double precision,numeric,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_shop_order_settings(uuid,boolean,boolean,numeric,double precision,double precision),public.shop_delivery_quote(uuid,uuid,double precision,double precision,numeric,numeric) TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.guard_shop_settings(),public.guard_shop_financial_snapshot() FROM PUBLIC,anon,authenticated;