-- Closed-app riders send GPS less often; treat a rider as present for 10 minutes after their last phone signal.
CREATE OR REPLACE FUNCTION public.rider_assign_block_reason(_rider uuid, _kind text DEFAULT NULL, _order uuid DEFAULT NULL, _manual boolean DEFAULT false)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r public.riders%ROWTYPE; busy uuid; z uuid := '00000000-0000-0000-0000-000000000000';
BEGIN
  SELECT * INTO r FROM riders WHERE id=_rider;
  IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM user_roles ur WHERE ur.user_id=_rider AND ur.role='rider') THEN RETURN 'یہ اکاؤنٹ رائیڈر نہیں'; END IF;
  IF r.is_suspended THEN RETURN 'یہ رائیڈر معطل ہے'; END IF;
  SELECT id INTO busy FROM orders WHERE rider_id=_rider AND status NOT IN ('delivered','completed','cancelled') AND NOT (COALESCE(_kind,'')='food' AND id=COALESCE(_order,z)) LIMIT 1;
  IF busy IS NULL THEN SELECT id INTO busy FROM grocery_cart_orders WHERE rider_id=_rider AND status NOT IN ('delivered','completed','cancelled','returned_to_store') AND NOT (COALESCE(_kind,'')='grocery_cart' AND id=COALESCE(_order,z)) LIMIT 1; END IF;
  IF busy IS NULL THEN SELECT id INTO busy FROM grocery_list_orders WHERE rider_id=_rider AND status NOT IN ('delivered','completed','cancelled','returned_to_store') AND NOT (COALESCE(_kind,'')='grocery_list' AND id=COALESCE(_order,z)) LIMIT 1; END IF;
  IF busy IS NOT NULL THEN RETURN 'رائیڈر کے پاس پہلے سے جاری آرڈر #'||left(busy::text,8)||' ہے؛ پہلے وہ مکمل کریں'; END IF;
  IF EXISTS(SELECT 1 FROM delivery_offers WHERE rider_id=_rider AND status='offered' AND expires_at>now() AND NOT (order_kind=COALESCE(_kind,'') AND order_id=COALESCE(_order,z))) THEN RETURN 'رائیڈر کو ابھی دوسرے آرڈر کی آفر جا رہی ہے؛ چند سیکنڈ بعد کوشش کریں'; END IF;
  IF _manual THEN RETURN NULL; END IF;
  IF NOT r.is_available THEN RETURN 'رائیڈر آف لائن ہے'; END IF;
  IF r.break_until IS NOT NULL AND r.break_until>now() THEN RETURN 'رائیڈر وقفے پر ہے'; END IF;
  IF r.current_lat IS NULL OR r.current_lng IS NULL OR r.last_seen_at IS NULL OR r.last_seen_at<now()-interval '10 minutes' OR r.location_updated_at IS NULL OR r.location_updated_at<now()-interval '10 minutes' THEN
    RETURN 'رائیڈر کے فون سے 10 منٹ سے کوئی سگنل نہیں آیا؛ فون پر ایپ اور لوکیشن چیک کریں';
  END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.rider_assign_block_reason(uuid,text,uuid,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rider_assign_block_reason(uuid,text,uuid,boolean) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.rider_dispatch_idle(_rider uuid, _kind text DEFAULT NULL::text, _order uuid DEFAULT NULL::uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.rider_assign_block_reason(_rider,_kind,_order,false) IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.guard_safe_rider_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE k text; oid uuid; c uuid; w numeric; pm text; amount numeric; r public.riders%ROWTYPE; staff boolean; reason text;
BEGIN
 IF TG_TABLE_NAME='delivery_offers' THEN
 k:=NEW.order_kind; oid:=NEW.order_id;
 IF TG_OP='UPDATE' OR NEW.status NOT IN ('offered','accepted') THEN RETURN NEW; END IF;
 ELSE
 k:=CASE TG_TABLE_NAME WHEN 'orders' THEN 'food' WHEN 'grocery_cart_orders' THEN 'grocery_cart' ELSE 'grocery_list' END; oid:=NEW.id;
 IF NEW.rider_id IS NULL THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' THEN IF NEW.rider_id IS NOT DISTINCT FROM OLD.rider_id THEN RETURN NEW; END IF; END IF;
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('rider-capacity:'||NEW.rider_id::text,0));
 staff := auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM NEW.rider_id AND public.is_staff(auth.uid());
 reason := public.rider_assign_block_reason(NEW.rider_id,k,oid,staff);
 IF reason IS NOT NULL THEN RAISE EXCEPTION '%', reason; END IF;
 IF TG_TABLE_NAME='delivery_offers' AND k='food' AND auth.uid() IS NOT NULL AND public.is_staff(auth.uid()) AND EXISTS(SELECT 1 FROM orders WHERE id=oid AND status IN ('confirmed','preparing','delivering')) THEN NEW.manual:=true;
 ELSIF NOT (staff AND k='food') AND NOT public.delivery_dispatch_ready(k,oid) THEN RAISE EXCEPTION 'آرڈر ابھی پک اَپ کے لیے تیار نہیں'; END IF;
 IF k='food' THEN SELECT city_id,COALESCE(billable_weight_kg,0),payment_method,total_amount INTO c,w,pm,amount FROM orders WHERE id=oid;
 ELSIF k='grocery_cart' THEN SELECT city_id,COALESCE(billable_weight_kg,0),payment_method,COALESCE(final_amount,total_amount) INTO c,w,pm,amount FROM grocery_cart_orders WHERE id=oid;
 ELSE SELECT s.city_id,0,o.payment_method,o.total_amount INTO c,w,pm,amount FROM grocery_list_orders o JOIN grocery_stores s ON s.id=o.store_id WHERE o.id=oid; END IF;
 SELECT * INTO r FROM riders WHERE id=NEW.rider_id;
 IF c IS NOT NULL AND r.city_id IS NULL THEN
   UPDATE riders SET city_id=c WHERE id=r.id; r.city_id:=c;
 END IF;
 IF c IS NOT NULL AND r.city_id IS DISTINCT FROM c THEN RAISE EXCEPTION 'رائیڈر اسی شہر کا ہونا ضروری ہے'; END IF;
 IF COALESCE(r.capacity_kg,(SELECT capacity_kg FROM vehicle_types WHERE id=r.vehicle_type_id),15)<w THEN RAISE EXCEPTION 'رائیڈر کی وزن گنجائش ناکافی ہے'; END IF;
 IF lower(COALESCE(pm,'cod'))='cod' AND public.rider_cash_outstanding(r.id)+COALESCE(amount,0)>public.rider_cash_limit() THEN RAISE EXCEPTION 'رائیڈر کی نقد حد پوری ہو چکی ہے'; END IF;
 IF TG_TABLE_NAME='delivery_offers' THEN NEW.is_batch:=false; END IF;
 RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.dispatch_next_rider(_kind text, _order_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE o record; city uuid; plat double precision; plng double precision; rd record; offer uuid; tries int; maxkm numeric;
BEGIN
 IF NOT public.delivery_dispatch_ready(_kind,_order_id) THEN RETURN NULL; END IF;
 IF _kind='food' THEN SELECT ord.*,r.name pickup,r.pickup_lat plat,r.pickup_lng plng INTO o FROM orders ord LEFT JOIN restaurants r ON r.id=ord.restaurant_id WHERE ord.id=_order_id FOR UPDATE OF ord;
 ELSIF _kind='grocery_cart' THEN SELECT ord.*,s.name pickup,NULL::double precision plat,NULL::double precision plng INTO o FROM grocery_cart_orders ord JOIN grocery_stores s ON s.id=ord.store_id WHERE ord.id=_order_id FOR UPDATE OF ord;
 ELSIF _kind='grocery_list' THEN SELECT ord.*,s.name pickup,s.city_id,NULL::double precision plat,NULL::double precision plng INTO o FROM grocery_list_orders ord JOIN grocery_stores s ON s.id=ord.store_id WHERE ord.id=_order_id FOR UPDATE OF ord;
 ELSE RETURN NULL; END IF;
 IF o.rider_id IS NOT NULL THEN RETURN NULL; END IF;
 city:=o.city_id; plat:=o.plat; plng:=o.plng;
 SELECT max_dispatch_km INTO maxkm FROM cities WHERE id=city AND auto_dispatch;
 IF NOT FOUND THEN RETURN NULL; END IF;
 IF EXISTS(SELECT 1 FROM delivery_offers WHERE order_kind=_kind AND order_id=_order_id AND status='offered' AND expires_at>now()) THEN RETURN NULL; END IF;
 UPDATE delivery_offers SET status='expired',responded_at=COALESCE(responded_at,now()) WHERE order_kind=_kind AND order_id=_order_id AND status='offered' AND expires_at<=now();
 SELECT count(DISTINCT rider_id) INTO tries FROM delivery_offers WHERE order_kind=_kind AND order_id=_order_id;
 IF tries<3 THEN
 FOR rd IN SELECT r.id FROM riders r WHERE r.city_id=city AND public.rider_dispatch_idle(r.id) AND NOT EXISTS(SELECT 1 FROM delivery_offers d WHERE d.rider_id=r.id AND d.order_kind=_kind AND d.order_id=_order_id) AND (plat IS NULL OR haversine_km(r.current_lat,r.current_lng,plat,plng)<=COALESCE(maxkm,15)) ORDER BY CASE WHEN plat IS NULL THEN 0 ELSE haversine_km(r.current_lat,r.current_lng,plat,plng) END,r.last_seen_at DESC FOR UPDATE SKIP LOCKED LOOP
 BEGIN
 INSERT INTO delivery_offers(order_id,order_kind,rider_id,distance_km,pickup_name,dropoff_address,total_amount,delivery_fee,expires_at) SELECT _order_id,_kind,rd.id,CASE WHEN plat IS NULL THEN NULL ELSE haversine_km(r.current_lat,r.current_lng,plat,plng) END,o.pickup,o.delivery_address,o.total_amount,COALESCE(o.delivery_fee,0),now()+interval '45 seconds' FROM riders r WHERE r.id=rd.id RETURNING id INTO offer;
 EXCEPTION WHEN OTHERS THEN offer:=NULL; END;
 EXIT WHEN offer IS NOT NULL;
 END LOOP; END IF;
 IF _kind='food' THEN UPDATE orders SET dispatch_state=CASE WHEN offer IS NOT NULL THEN 'offered' ELSE 'stuck' END WHERE id=_order_id;
 ELSIF _kind='grocery_cart' THEN UPDATE grocery_cart_orders SET dispatch_state=CASE WHEN offer IS NOT NULL THEN 'offered' ELSE 'stuck' END WHERE id=_order_id;
 ELSE UPDATE grocery_list_orders SET dispatch_state=CASE WHEN offer IS NOT NULL THEN 'offered' ELSE 'stuck' END WHERE id=_order_id; END IF;
 RETURN offer;
END $function$;