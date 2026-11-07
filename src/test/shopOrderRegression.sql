-- Real RPC tests; all fixtures, stock, events and notifications roll back.
BEGIN;
SET LOCAL statement_timeout='30s';
DO $test$
DECLARE owner uuid:='52634431-32e8-4bd7-b171-d92c2add25ff'; source public.grocery_stores%ROWTYPE;
 shop uuid; p1 uuid; p2 uuid; ord uuid; i1 uuid; i2 uuid; kind text; fee numeric; result numeric;
BEGIN
 PERFORM set_config('request.jwt.claim.sub',owner::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner,'email',(SELECT email FROM auth.users WHERE id=owner))::text,true);
 FOR kind IN SELECT unnest(ARRAY['retail','wholesale']) LOOP
  SELECT * INTO STRICT source FROM public.grocery_stores WHERE owner_id=owner AND store_type=kind AND pickup_lat IS NOT NULL LIMIT 1;
  shop:=gen_random_uuid(); p1:=gen_random_uuid(); p2:=gen_random_uuid();
  INSERT INTO public.grocery_stores SELECT (jsonb_populate_record(NULL::public.grocery_stores,to_jsonb(source)||jsonb_build_object('id',shop,'name','QA rollback shop','slug',shop::text,'auto_accept_orders',true,'opening_time','00:00','closing_time','00:00','is_active',true,'minimum_order',0,'advance_percent',0))).*;
  INSERT INTO public.grocery_products(id,store_id,name,price,is_available,stock_qty,weight_kg) VALUES(p1,shop,'QA item 1',100,true,20,0.5),(p2,shop,'QA item 2',200,true,20,0.5);
  ord:=public.create_shop_order(shop,source.city_id,'QA rollback address',NULL,jsonb_build_array(jsonb_build_object('id',p1,'quantity',1),jsonb_build_object('id',p2,'quantity',1)),source.pickup_lat,source.pickup_lng);
  IF (SELECT status FROM public.grocery_cart_orders WHERE id=ord)<>'pending' OR (SELECT accepted_at FROM public.grocery_cart_orders WHERE id=ord) IS NOT NULL THEN RAISE EXCEPTION '% auto accepted despite manual acceptance rule',kind; END IF;
  IF (SELECT stock_qty FROM public.grocery_products WHERE id=p1)<>19 THEN RAISE EXCEPTION 'Stock was not reserved'; END IF;
  PERFORM public.shop_order_action(ord,'accept');
  SELECT id INTO STRICT i1 FROM public.grocery_order_items WHERE order_id=ord AND product_id=p1;
  SELECT id INTO STRICT i2 FROM public.grocery_order_items WHERE order_id=ord AND product_id=p2;
  SELECT delivery_fee INTO fee FROM public.grocery_cart_orders WHERE id=ord;
  PERFORM public.grocery_pick_item(i1,'unavailable');
  IF (SELECT status FROM public.grocery_cart_orders WHERE id=ord)<>'confirmed' THEN RAISE EXCEPTION 'Mixed order wrongly cancelled'; END IF;
  PERFORM public.grocery_pick_item(i2,'unavailable');
  IF (SELECT status FROM public.grocery_cart_orders WHERE id=ord)<>'cancelled' OR (SELECT final_amount FROM public.grocery_cart_orders WHERE id=ord)<>0 THEN RAISE EXCEPTION '% all unavailable order still active or charging delivery',kind; END IF;
  IF (SELECT delivery_fee FROM public.grocery_cart_orders WHERE id=ord)<>fee THEN RAISE EXCEPTION 'Delivery snapshot changed'; END IF;
  IF (SELECT stock_qty FROM public.grocery_products WHERE id=p1)<>20 OR (SELECT stock_qty FROM public.grocery_products WHERE id=p2)<>20 THEN RAISE EXCEPTION 'Stock was not released exactly once'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.order_events WHERE order_id=ord AND event_type='status' AND to_value='cancelled') THEN RAISE EXCEPTION 'Cancellation event missing'; END IF;
  ord:=public.create_shop_order(shop,source.city_id,'QA rollback address',NULL,jsonb_build_array(jsonb_build_object('id',p1,'quantity',1)),source.pickup_lat,source.pickup_lng);
  PERFORM public.shop_order_action(ord,'accept');
  SELECT id INTO STRICT i1 FROM public.grocery_order_items WHERE order_id=ord;
  PERFORM public.grocery_substitute_item(i1,p2,1,'QA alternative');
  IF (SELECT status FROM public.grocery_cart_orders WHERE id=ord)<>'confirmed' OR (SELECT approval_status FROM public.grocery_order_items WHERE id=i1)<>'pending_customer' THEN RAISE EXCEPTION 'Pending alternative wrongly cancelled'; END IF;
  result:=public.grocery_respond_substitution(i1,false);
  IF result<>0 OR (SELECT status FROM public.grocery_cart_orders WHERE id=ord)<>'cancelled' THEN RAISE EXCEPTION 'Rejected last alternative did not cancel'; END IF;
  PERFORM public.save_shop_order_settings(shop,true,false,NULL,source.pickup_lat,source.pickup_lng);
  IF (SELECT auto_accept_orders FROM public.grocery_stores WHERE id=shop) THEN RAISE EXCEPTION 'Old client reenabled auto accept'; END IF;
 END LOOP;
 RAISE NOTICE 'PASS retail and wholesale: manual acceptance, mixed stock, all unavailable, zero final bill, retained fee snapshot, restored stock, cancellation event, pending/rejected alternative, old settings client';
END $test$;
ROLLBACK;