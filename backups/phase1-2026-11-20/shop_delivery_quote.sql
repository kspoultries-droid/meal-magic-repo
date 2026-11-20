CREATE OR REPLACE FUNCTION public.shop_delivery_quote(_store_id uuid, _city_id uuid, _lat double precision, _lng double precision, _weight_kg numeric, _subtotal numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
END $function$

