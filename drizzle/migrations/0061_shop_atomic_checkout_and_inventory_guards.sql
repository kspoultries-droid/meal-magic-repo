CREATE OR REPLACE FUNCTION public.shop_order_is_open(_opens time,_closes time) RETURNS boolean LANGUAGE sql STABLE SET search_path=public AS $$
 SELECT CASE WHEN _opens IS NULL OR _closes IS NULL OR _opens=_closes THEN true WHEN _opens<_closes THEN (now() AT TIME ZONE 'Asia/Karachi')::time>=_opens AND (now() AT TIME ZONE 'Asia/Karachi')::time<_closes ELSE (now() AT TIME ZONE 'Asia/Karachi')::time>=_opens OR (now() AT TIME ZONE 'Asia/Karachi')::time<_closes END
$$;
CREATE OR REPLACE FUNCTION public.create_shop_order(_store_id uuid,_city_id uuid,_delivery_address text,_notes text,_items jsonb,_delivery_lat double precision,_delivery_lng double precision,_receiver_name text DEFAULT NULL,_receiver_phone text DEFAULT NULL,_is_gift boolean DEFAULT false,_voucher_code text DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.grocery_stores%ROWTYPE; p public.grocery_products%ROWTYPE; j jsonb; v jsonb; clean jsonb:='[]'; qty integer; price numeric; subtotal numeric:=0; weight numeric:=0; q jsonb; id uuid; discount numeric:=0; voucher public.vouchers%ROWTYPE; auto_ok boolean:=true; variant text; fee numeric; customerfee numeric; state text; previous text;
BEGIN
 IF auth.uid() IS NULL OR coalesce(auth.jwt()->>'email','')='' OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Verify email before ordering'; END IF;
 IF length(trim(coalesce(_delivery_address,''))) NOT BETWEEN 5 AND 1000 OR jsonb_typeof(_items)<>'array' OR jsonb_array_length(_items) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Invalid order'; END IF;
 SELECT * INTO s FROM public.grocery_stores WHERE grocery_stores.id=_store_id AND is_active;
 IF s.id IS NULL OR NOT public.shop_order_is_open(s.opening_time::time,s.closing_time::time) THEN RAISE EXCEPTION 'Shop is closed'; END IF;
 IF coalesce(s.advance_percent,0)>0 THEN RAISE EXCEPTION 'This shop requires verified advance payment; contact shop before ordering'; END IF;
 -- Deterministic locks prevent concurrent checkouts overselling the last units.
 PERFORM 1 FROM public.grocery_products WHERE grocery_products.id IN (SELECT (x->>'id')::uuid FROM jsonb_array_elements(_items) x) ORDER BY grocery_products.id FOR UPDATE;
 FOR j IN SELECT * FROM jsonb_array_elements(_items) LOOP
  qty:=(j->>'quantity')::integer; IF qty IS NULL OR qty<1 OR qty>100000 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
  SELECT * INTO p FROM public.grocery_products WHERE grocery_products.id=(j->>'id')::uuid AND store_id=s.id AND is_available;
  IF p.id IS NULL THEN RAISE EXCEPTION 'Product unavailable'; END IF;
  IF qty<coalesce(p.min_order_qty,1) THEN RAISE EXCEPTION 'Minimum product quantity is %',p.min_order_qty; END IF;
  price:=coalesce(p.wholesale_price,p.discount_price,p.price); variant:=nullif(j->>'variant_id',''); v:=NULL;
  IF jsonb_array_length(coalesce(p.variants,'[]'))>0 THEN
   SELECT value INTO v FROM jsonb_array_elements(p.variants) WHERE coalesce(value->>'id',value->>'label',value->>'name')=variant;
   IF v IS NULL OR coalesce((v->>'is_available')::boolean,true)=false THEN RAISE EXCEPTION 'Choose an available product option'; END IF;
   price:=price+coalesce((v->>'price_delta')::numeric,0);
   IF v->>'stock_qty' IS NULL THEN auto_ok:=false; END IF;
  ELSIF variant IS NOT NULL THEN RAISE EXCEPTION 'Invalid option'; END IF;
  IF price<0 THEN RAISE EXCEPTION 'Invalid price'; END IF;
  IF p.stock_qty IS NULL OR p.is_weight_based THEN auto_ok:=false; END IF;
  subtotal:=subtotal+price*qty; weight:=weight+greatest(coalesce(p.weight_kg,0.5),0.1)*qty;
  clean:=clean||jsonb_build_array(jsonb_build_object('id',p.id,'name',p.name,'quantity',qty,'price',price,'unit_price',price,'variant_id',variant,'variant_label',coalesce(v->>'label',v->>'name')));
 END LOOP;
 IF subtotal<coalesce(s.minimum_order,0) THEN RAISE EXCEPTION 'Shop minimum order is Rs %',s.minimum_order; END IF;
 IF nullif(trim(_voucher_code),'') IS NOT NULL THEN
  SELECT * INTO voucher FROM public.vouchers WHERE upper(code)=upper(trim(_voucher_code)) AND is_active FOR UPDATE;
  IF voucher.id IS NULL OR voucher.scope NOT IN ('all','grocery','wholesale') OR voucher.valid_from>now() OR voucher.valid_until<now() OR voucher.usage_limit IS NOT NULL AND voucher.used_count>=voucher.usage_limit OR subtotal<voucher.min_order THEN RAISE EXCEPTION 'Voucher no longer valid'; END IF;
  discount:=CASE WHEN voucher.discount_type='percent' THEN round(subtotal*voucher.discount_value/100) ELSE voucher.discount_value END;
  discount:=least(discount,coalesce(voucher.max_discount,discount),subtotal);
 END IF;
 q:=public.shop_delivery_quote(s.id,_city_id,_delivery_lat,_delivery_lng,weight,subtotal-discount);
 IF coalesce((q->>'needs_quote')::boolean,false) THEN RAISE EXCEPTION 'Delivery quote needs staff confirmation'; END IF;
 fee:=(q->>'shipping_cost')::numeric; customerfee:=(q->>'customer_fee')::numeric;
 state:=CASE WHEN s.auto_accept_orders AND auto_ok AND q->>'mode'='rider' THEN 'confirmed' ELSE 'pending' END;
 INSERT INTO public.grocery_cart_orders(store_id,customer_id,items,total_amount,delivery_address,delivery_lat,delivery_lng,notes,payment_method,status,is_gift,receiver_name,receiver_phone,city_id,delivery_method,delivery_fee,shipping_cost,customer_delivery_fee,delivery_fee_payer,delivery_policy_snapshot,delivery_mode_calc,vehicle_type_id,billable_weight_kg,distance_km,fee_breakdown,discount_amount,voucher_code,inventory_managed,accepted_at)
 VALUES(s.id,auth.uid(),clean,subtotal-discount+customerfee,_delivery_address,_delivery_lat,_delivery_lng,_notes,'cod',state,_is_gift,_receiver_name,_receiver_phone,_city_id,CASE WHEN q->>'mode' IN ('courier','intercity') THEN 'courier' ELSE 'local_rider' END,fee,fee,customerfee,q->>'fee_payer',q->'policy',q->>'mode',(q->>'vehicle_type_id')::uuid,weight,(q->>'distance_km')::numeric,q,discount,voucher.code,true,CASE WHEN state='confirmed' THEN now() END) RETURNING grocery_cart_orders.id INTO id;
 IF voucher.id IS NOT NULL THEN UPDATE public.vouchers SET used_count=used_count+1 WHERE vouchers.id=voucher.id; END IF;
 RETURN id;
END $$;
-- Keep old clients on the same server-authoritative checkout instead of an unreserved path.
CREATE OR REPLACE FUNCTION public.create_grocery_cart_order(_store_id uuid,_city_id uuid,_delivery_address text,_notes text,_payment_method text,_items jsonb,_receiver_name text DEFAULT NULL,_receiver_phone text DEFAULT NULL,_is_gift boolean DEFAULT false,_delivery_lat double precision DEFAULT NULL,_delivery_lng double precision DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF _payment_method IS DISTINCT FROM 'cod' THEN RAISE EXCEPTION 'Verified payment integration required'; END IF;
 RETURN public.create_shop_order(_store_id,_city_id,_delivery_address,_notes,_items,_delivery_lat,_delivery_lng,_receiver_name,_receiver_phone,_is_gift,NULL);
END $$;
CREATE OR REPLACE FUNCTION public.shop_order_action(_order_id uuid,_action text,_reason text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.grocery_cart_orders%ROWTYPE;
BEGIN
 SELECT * INTO o FROM public.grocery_cart_orders WHERE id=_order_id FOR UPDATE;
 IF auth.uid() IS NULL OR NOT public.grocery_can_manage_order(o.id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
 IF _action='ready' THEN PERFORM public.shop_mark_order_ready(o.id);
 ELSIF _action='accept' AND o.status='pending' THEN UPDATE public.grocery_cart_orders SET status='confirmed',accepted_at=coalesce(accepted_at,now()) WHERE id=o.id;
 ELSIF _action='cancel' AND o.status IN ('pending','confirmed','picking','preparing','packed') AND length(trim(coalesce(_reason,''))) BETWEEN 3 AND 500 THEN UPDATE public.grocery_cart_orders SET status='cancelled',cancellation_reason=trim(_reason),reject_reason=trim(_reason) WHERE id=o.id;
 ELSE RAISE EXCEPTION 'Invalid shop action'; END IF;
END $$;
-- Item mutations require the parent lock first to serialize against readiness/cancellation.
DO $patch$ DECLARE fn text; def text; BEGIN
 FOREACH fn IN ARRAY ARRAY['grocery_pick_item','grocery_substitute_item','grocery_respond_substitution'] LOOP
  SELECT pg_get_functiondef(p.oid) INTO def FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname=fn;
  def:=replace(def,'BEGIN','BEGIN'||chr(10)||' PERFORM 1 FROM public.grocery_cart_orders WHERE id=(SELECT order_id FROM public.grocery_order_items WHERE id=_item_id) FOR UPDATE;'||chr(10)); EXECUTE def;
 END LOOP;
END $patch$;
REVOKE ALL ON FUNCTION public.create_shop_order(uuid,uuid,text,text,jsonb,double precision,double precision,text,text,boolean,text),public.shop_order_action(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_shop_order(uuid,uuid,text,text,jsonb,double precision,double precision,text,text,boolean,text),public.shop_order_action(uuid,text,text) TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.shop_order_is_open(time,time) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.shop_order_is_open(time,time) TO authenticated,service_role;