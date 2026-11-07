-- Isolated database checks use copies of deployed functions, never production fixtures.
BEGIN;
CREATE TEMP TABLE grocery_list_orders (LIKE public.grocery_list_orders INCLUDING DEFAULTS);
CREATE TEMP TABLE grocery_stores (LIKE public.grocery_stores INCLUDING DEFAULTS);
CREATE TEMP TABLE shop_customer_blocks (LIKE public.shop_customer_blocks INCLUDING DEFAULTS);
CREATE FUNCTION pg_temp.has_role(uuid,public.app_role) RETURNS boolean LANGUAGE sql AS 'SELECT false';
DO $$
DECLARE name text; body text;
BEGIN
 FOREACH name IN ARRAY ARRAY['guard_list_submission','guard_list_readiness','protect_grocery_list_pricing'] LOOP
  body:=pg_get_functiondef(('public.'||name||'()')::regprocedure);
  body:=replace(body,'FUNCTION public.'||name,'FUNCTION pg_temp.'||name);
  body:=replace(body,'public.grocery_list_orders','pg_temp.grocery_list_orders');
  body:=replace(body,'public.grocery_stores','pg_temp.grocery_stores');
  body:=replace(body,'public.shop_customer_blocks','pg_temp.shop_customer_blocks');
  body:=replace(body,'public.has_role','pg_temp.has_role');
  body:=replace(body,'auth.uid()','nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid');
  EXECUTE body;
 END LOOP;
END $$;
CREATE TRIGGER submission BEFORE INSERT ON pg_temp.grocery_list_orders FOR EACH ROW EXECUTE FUNCTION pg_temp.guard_list_submission();
CREATE TRIGGER pricing BEFORE UPDATE ON pg_temp.grocery_list_orders FOR EACH ROW EXECUTE FUNCTION pg_temp.protect_grocery_list_pricing();
CREATE TRIGGER readiness BEFORE UPDATE ON pg_temp.grocery_list_orders FOR EACH ROW EXECUTE FUNCTION pg_temp.guard_list_readiness();
DO $$
DECLARE customer uuid:='11111111-1111-4111-8111-111111111111'; store uuid:='22222222-2222-4222-8222-222222222222'; oid uuid; failed boolean;
BEGIN
 INSERT INTO pg_temp.grocery_stores(id,owner_id,name,pickup_lat,pickup_lng) VALUES(store,'33333333-3333-4333-8333-333333333333','QA',28.4,70.3);
 PERFORM set_config('request.jwt.claim.sub',customer::text,true);
 -- Missing location must fail.
 failed:=false;
 BEGIN INSERT INTO pg_temp.grocery_list_orders(customer_id,store_id,image_url) VALUES(customer,store,'qa'); EXCEPTION WHEN SQLSTATE 'P0001' THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Missing location accepted'; END IF;
 -- 5 photos must fail; 4 succeed and always start pending/zero.
 failed:=false;
 BEGIN INSERT INTO pg_temp.grocery_list_orders(customer_id,store_id,image_url,image_urls,delivery_lat,delivery_lng) VALUES(customer,store,'qa',ARRAY['1','2','3','4','5'],28.4,70.3); EXCEPTION WHEN SQLSTATE 'P0001' THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION '5 photos allowed'; END IF;
 INSERT INTO pg_temp.grocery_list_orders(customer_id,store_id,image_url,image_urls,delivery_lat,delivery_lng,status,total_amount) VALUES(customer,store,'qa',ARRAY['1','2','3','4'],28.4,70.3,'confirmed',100) RETURNING id INTO oid;
 IF NOT EXISTS(SELECT 1 FROM pg_temp.grocery_list_orders WHERE id=oid AND status='pending' AND total_amount=0) THEN RAISE EXCEPTION 'Client price/accept trusted'; END IF;
 -- Second waiting list denied.
 failed:=false;
 BEGIN INSERT INTO pg_temp.grocery_list_orders(customer_id,store_id,image_url,delivery_lat,delivery_lng) VALUES(customer,store,'qa',28.4,70.3); EXCEPTION WHEN SQLSTATE 'P0001' THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Second waiting list allowed'; END IF;
 -- Cancel frees waiting slot.
 UPDATE pg_temp.grocery_list_orders SET status='cancelled' WHERE id=oid;
 INSERT INTO pg_temp.shop_customer_blocks(store_id,customer_id,reason) VALUES(store,customer,'QA block');
 failed:=false;
 BEGIN INSERT INTO pg_temp.grocery_list_orders(customer_id,store_id,image_url,delivery_lat,delivery_lng) VALUES(customer,store,'qa',28.4,70.3); EXCEPTION WHEN SQLSTATE 'P0001' THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Shop block bypassed'; END IF;
 DELETE FROM pg_temp.shop_customer_blocks WHERE customer_id=customer;
 INSERT INTO pg_temp.grocery_list_orders(customer_id,store_id,image_url,delivery_lat,delivery_lng) VALUES(customer,store,'qa',28.4,70.3) RETURNING id INTO oid;
 -- Fake financial writes blocked.
 failed:=false;
 BEGIN UPDATE pg_temp.grocery_list_orders SET total_amount=1 WHERE id=oid; EXCEPTION WHEN SQLSTATE 'P0001' THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Customer price tampering allowed'; END IF;
 -- Readiness rejects unaccepted quote even for authorized operations.
 PERFORM set_config('app.list_action','on',true);
 failed:=false;
 BEGIN UPDATE pg_temp.grocery_list_orders SET status='ready_for_pickup',total_amount=300 WHERE id=oid; EXCEPTION WHEN SQLSTATE 'P0001' THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Readiness without acceptance allowed'; END IF;
 UPDATE pg_temp.grocery_list_orders SET status='ready_for_pickup',total_amount=300,accepted_quote_version=quote_version WHERE id=oid;
 RAISE NOTICE 'PASS: pins, 4 photos, one waiting list, cancellation, shop block, immutable prices and final readiness';
END $$;
ROLLBACK;
