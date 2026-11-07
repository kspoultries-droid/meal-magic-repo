-- Copies the deployed action into temporary tables; no real orders are changed.
BEGIN;
CREATE TEMP TABLE grocery_list_orders (LIKE public.grocery_list_orders INCLUDING DEFAULTS);
CREATE TEMP TABLE grocery_stores (LIKE public.grocery_stores INCLUDING DEFAULTS);
CREATE FUNCTION pg_temp.has_role(uuid,public.app_role) RETURNS boolean LANGUAGE sql AS 'SELECT false';
DO $$
DECLARE body text;
BEGIN
 SELECT pg_get_functiondef(oid) INTO body FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname='list_order_action';
 body:=replace(body,'FUNCTION public.list_order_action','FUNCTION pg_temp.list_order_action');
 body:=replace(body,'public.grocery_list_orders','pg_temp.grocery_list_orders');
 body:=replace(body,'public.grocery_stores','pg_temp.grocery_stores');
 body:=replace(body,'public.has_role','pg_temp.has_role');
 body:=replace(body,'auth.uid()','nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid');
 EXECUTE body;
END $$;
DO $$
DECLARE owner_id uuid:='33333333-3333-4333-8333-333333333333'; store uuid:='22222222-2222-4222-8222-222222222222'; oid uuid; state text; before_row jsonb; after_row jsonb; denied boolean;
BEGIN
 INSERT INTO pg_temp.grocery_stores(id,owner_id,name) VALUES(store,owner_id,'QA receipt');
 PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
 FOREACH state IN ARRAY ARRAY['pending','quoted','confirmed','ready_for_pickup','delivering'] LOOP
  INSERT INTO pg_temp.grocery_list_orders(customer_id,store_id,image_url,status,total_amount,items_subtotal,delivery_fee,quote_version,accepted_quote_version)
  VALUES('11111111-1111-4111-8111-111111111111',store,'qa-list',state,380,300,80,2,2) RETURNING id INTO oid;
  SELECT to_jsonb(o) INTO before_row FROM pg_temp.grocery_list_orders o WHERE id=oid;
  PERFORM pg_temp.list_order_action(oid,'bill',_bill:='qa-receipt');
  SELECT to_jsonb(o) INTO after_row FROM pg_temp.grocery_list_orders o WHERE id=oid;
  IF after_row->>'bill_image_url' IS DISTINCT FROM 'qa-receipt' THEN RAISE EXCEPTION 'Receipt missing in %',state; END IF;
  IF (before_row-'bill_image_url') IS DISTINCT FROM (after_row-'bill_image_url') THEN RAISE EXCEPTION 'Receipt changed approved order in %',state; END IF;
  IF state IN ('confirmed','ready_for_pickup','delivering') THEN
   denied:=false;
   BEGIN PERFORM pg_temp.list_order_action(oid,'bill',_bill:='replacement'); EXCEPTION WHEN SQLSTATE 'P0001' THEN denied:=true; END;
   IF NOT denied THEN RAISE EXCEPTION 'Approved receipt replacement allowed in %',state; END IF;
  END IF;
 END LOOP;
 -- Customer cannot attach the shop receipt.
 PERFORM set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
 denied:=false;
 BEGIN PERFORM pg_temp.list_order_action(oid,'bill',_bill:='customer-image'); EXCEPTION WHEN SQLSTATE 'P0001' THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Customer receipt upload allowed'; END IF;
 PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
 FOREACH state IN ARRAY ARRAY['completed','delivered','cancelled','returned_to_store'] LOOP
  UPDATE pg_temp.grocery_list_orders SET status=state,bill_image_url=NULL WHERE id=oid;
  denied:=false;
  BEGIN PERFORM pg_temp.list_order_action(oid,'bill',_bill:='late-image'); EXCEPTION WHEN SQLSTATE 'P0001' THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Closed order receipt changed in %',state; END IF;
 END LOOP;
 RAISE NOTICE 'PASS: first receipt after acceptance, unchanged prices/versions/stages, replacement and authorization guards';
END $$;
ROLLBACK;