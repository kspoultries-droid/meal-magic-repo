CREATE OR REPLACE FUNCTION public.delivery_dispatch_ready(_kind text, _id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
SELECT CASE _kind
 WHEN 'food' THEN EXISTS(SELECT 1 FROM orders o WHERE o.id=_id AND o.status IN ('confirmed','preparing','delivering') AND COALESCE(o.delivery_mode_calc,'rider') NOT IN ('courier','intercity') AND (o.status='delivering' OR COALESCE(o.ready_at,COALESCE(o.accepted_at,o.created_at)+make_interval(mins=>COALESCE(o.prep_minutes,15)))<=now()+interval '8 minutes'))
 WHEN 'grocery_cart' THEN EXISTS(SELECT 1 FROM grocery_cart_orders o WHERE o.id=_id AND o.status IN ('ready_for_pickup','ready') AND COALESCE(o.delivery_method,'local_rider')<>'courier' AND COALESCE(o.delivery_mode_calc,'rider') NOT IN ('courier','intercity') AND NOT EXISTS(SELECT 1 FROM grocery_order_items i WHERE i.order_id=o.id AND i.approval_status='pending_customer'))
 WHEN 'grocery_list' THEN EXISTS(SELECT 1 FROM grocery_list_orders o WHERE o.id=_id AND o.status IN ('ready_for_pickup','ready') AND o.total_amount IS NOT NULL AND o.total_amount>0)
 ELSE false END;
$$;
CREATE OR REPLACE FUNCTION public.rider_dispatch_idle(_rider uuid,_kind text DEFAULT NULL,_order uuid DEFAULT NULL) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
SELECT EXISTS(SELECT 1 FROM riders r WHERE r.id=_rider AND r.is_available AND NOT r.is_suspended AND (r.break_until IS NULL OR r.break_until<=now()) AND r.last_seen_at>=now()-interval '90 seconds' AND r.location_updated_at>=now()-interval '90 seconds' AND r.current_lat IS NOT NULL AND r.current_lng IS NOT NULL AND EXISTS(SELECT 1 FROM user_roles ur WHERE ur.user_id=r.id AND ur.role='rider'))
AND NOT EXISTS(SELECT 1 FROM orders WHERE rider_id=_rider AND status NOT IN ('delivered','completed','cancelled') AND NOT (COALESCE(_kind,'')='food' AND id=COALESCE(_order,'00000000-0000-0000-0000-000000000000'::uuid)))
AND NOT EXISTS(SELECT 1 FROM grocery_cart_orders WHERE rider_id=_rider AND status NOT IN ('delivered','completed','cancelled','returned_to_store') AND NOT (COALESCE(_kind,'')='grocery_cart' AND id=COALESCE(_order,'00000000-0000-0000-0000-000000000000'::uuid)))
AND NOT EXISTS(SELECT 1 FROM grocery_list_orders WHERE rider_id=_rider AND status NOT IN ('delivered','completed','cancelled','returned_to_store') AND NOT (COALESCE(_kind,'')='grocery_list' AND id=COALESCE(_order,'00000000-0000-0000-0000-000000000000'::uuid)))
AND NOT EXISTS(SELECT 1 FROM delivery_offers WHERE rider_id=_rider AND status='offered' AND expires_at>now() AND NOT (order_kind=COALESCE(_kind,'') AND order_id=COALESCE(_order,'00000000-0000-0000-0000-000000000000'::uuid)));
$$;
ALTER TABLE public.delivery_offers ADD COLUMN IF NOT EXISTS estimated_earning numeric, ADD COLUMN IF NOT EXISTS cash_to_collect numeric, ADD COLUMN IF NOT EXISTS earning_distance_km numeric;
CREATE OR REPLACE FUNCTION public.guard_safe_rider_assignment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE k text; c uuid; w numeric; pm text; amount numeric; mode text; r public.riders%ROWTYPE;
BEGIN
 k:=CASE TG_TABLE_NAME WHEN 'orders' THEN 'food' WHEN 'grocery_cart_orders' THEN 'grocery_cart' WHEN 'grocery_list_orders' THEN 'grocery_list' ELSE NEW.order_kind END;
 IF TG_TABLE_NAME='delivery_offers' THEN
   IF TG_OP='UPDATE' THEN RETURN NEW; END IF;
   IF NEW.status NOT IN ('offered','accepted') THEN RETURN NEW; END IF;
 ELSE
   IF NEW.rider_id IS NULL THEN RETURN NEW; END IF;
   IF TG_OP='UPDATE' THEN IF NEW.rider_id IS NOT DISTINCT FROM OLD.rider_id THEN RETURN NEW; END IF; END IF;
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('rider-capacity:'||NEW.rider_id::text,0));
 IF NOT public.rider_dispatch_idle(NEW.rider_id,k,CASE WHEN TG_TABLE_NAME='delivery_offers' THEN NEW.order_id ELSE NEW.id END) THEN RAISE EXCEPTION 'رائیڈر مصروف، آف لائن یا مقام پرانا ہے؛ پہلے جاری ڈیلیوری مکمل کریں'; END IF;
 IF NOT public.delivery_dispatch_ready(k,CASE WHEN TG_TABLE_NAME='delivery_offers' THEN NEW.order_id ELSE NEW.id END) THEN RAISE EXCEPTION 'آرڈر ابھی پک اَپ کے لیے تیار نہیں'; END IF;
 IF k='food' THEN SELECT city_id,COALESCE(billable_weight_kg,0),payment_method,total_amount INTO c,w,pm,amount FROM orders WHERE id=CASE WHEN TG_TABLE_NAME='delivery_offers' THEN NEW.order_id ELSE NEW.id END;
 ELSIF k='grocery_cart' THEN SELECT city_id,COALESCE(billable_weight_kg,0),payment_method,COALESCE(final_amount,total_amount) INTO c,w,pm,amount FROM grocery_cart_orders WHERE id=CASE WHEN TG_TABLE_NAME='delivery_offers' THEN NEW.order_id ELSE NEW.id END;
 ELSE SELECT s.city_id,0,o.payment_method,o.total_amount INTO c,w,pm,amount FROM grocery_list_orders o JOIN grocery_stores s ON s.id=o.store_id WHERE o.id=CASE WHEN TG_TABLE_NAME='delivery_offers' THEN NEW.order_id ELSE NEW.id END; END IF;
 SELECT * INTO r FROM riders WHERE id=NEW.rider_id;
 IF c IS NOT NULL AND r.city_id IS DISTINCT FROM c THEN RAISE EXCEPTION 'رائیڈر اسی شہر کا ہونا ضروری ہے'; END IF;
 IF COALESCE(r.capacity_kg,(SELECT capacity_kg FROM vehicle_types WHERE id=r.vehicle_type_id),15)<w THEN RAISE EXCEPTION 'رائیڈر کی وزن گنجائش ناکافی ہے'; END IF;
 IF lower(COALESCE(pm,'cod'))='cod' AND public.rider_cash_outstanding(r.id)+COALESCE(amount,0)>public.rider_cash_limit() THEN RAISE EXCEPTION 'رائیڈر کی نقد حد پوری ہو چکی ہے'; END IF;
 IF TG_TABLE_NAME='delivery_offers' THEN NEW.is_batch:=false; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_safe_rider_offer BEFORE INSERT ON public.delivery_offers FOR EACH ROW EXECUTE FUNCTION public.guard_safe_rider_assignment();
CREATE TRIGGER a_safe_food_assignment BEFORE INSERT OR UPDATE OF rider_id ON public.orders FOR EACH ROW EXECUTE FUNCTION public.guard_safe_rider_assignment();
CREATE TRIGGER a_safe_cart_assignment BEFORE INSERT OR UPDATE OF rider_id ON public.grocery_cart_orders FOR EACH ROW EXECUTE FUNCTION public.guard_safe_rider_assignment();
CREATE TRIGGER a_safe_list_assignment BEFORE INSERT OR UPDATE OF rider_id ON public.grocery_list_orders FOR EACH ROW EXECUTE FUNCTION public.guard_safe_rider_assignment();
CREATE OR REPLACE FUNCTION public.snapshot_rider_offer_pay() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p rider_pay_plans%ROWTYPE; city uuid; dist numeric; pm text; total numeric;
BEGIN
 SELECT city_id INTO city FROM riders WHERE id=NEW.rider_id;
 SELECT * INTO p FROM rider_pay_plans WHERE is_active AND (rider_id=NEW.rider_id OR (rider_id IS NULL AND (city_id=city OR city_id IS NULL))) ORDER BY (rider_id IS NOT NULL) DESC,(city_id IS NOT NULL) DESC,created_at DESC LIMIT 1;
 IF NEW.order_kind='food' THEN SELECT COALESCE(o.distance_km,CASE WHEN r.pickup_lat IS NOT NULL AND r.pickup_lng IS NOT NULL AND o.delivery_lat IS NOT NULL AND o.delivery_lng IS NOT NULL THEN haversine_km(r.pickup_lat,r.pickup_lng,o.delivery_lat,o.delivery_lng) END),o.payment_method,o.total_amount INTO dist,pm,total FROM orders o LEFT JOIN restaurants r ON r.id=o.restaurant_id WHERE o.id=NEW.order_id;
 ELSIF NEW.order_kind='grocery_cart' THEN SELECT distance_km,payment_method,COALESCE(final_amount,total_amount) INTO dist,pm,total FROM grocery_cart_orders WHERE id=NEW.order_id;
 ELSE SELECT payment_method,total_amount INTO pm,total FROM grocery_list_orders WHERE id=NEW.order_id; END IF;
 NEW.earning_distance_km:=dist;
 NEW.cash_to_collect:=CASE WHEN lower(COALESCE(pm,'cod'))='cod' THEN COALESCE(total,0) ELSE 0 END;
 NEW.estimated_earning:=CASE WHEN p.id IS NULL OR (COALESCE(p.per_km_fee,0)>0 AND dist IS NULL) THEN NULL WHEN p.pay_type='salaried' THEN ROUND(COALESCE(p.per_km_fee,0)*COALESCE(dist,0)) ELSE GREATEST(COALESCE(p.min_order_pay,0),COALESCE(p.per_order_fee,0)+ROUND(COALESCE(p.per_km_fee,0)*COALESCE(dist,0))) END;
 RETURN NEW;
END $$;
CREATE TRIGGER b_snapshot_offer_pay BEFORE INSERT ON public.delivery_offers FOR EACH ROW EXECUTE FUNCTION public.snapshot_rider_offer_pay();
CREATE OR REPLACE FUNCTION public.notify_offer_events() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.status='offered' AND NEW.expires_at>now() THEN
   IF TG_OP='INSERT' THEN PERFORM public.notify_user(NEW.rider_id,'offer','نئی ڈیلیوری آفر!',COALESCE(NEW.pickup_name,'دکان')||' — قبولیت کا انتظار','/rider-dashboard');
   ELSIF OLD.status IS DISTINCT FROM NEW.status THEN PERFORM public.notify_user(NEW.rider_id,'offer','نئی ڈیلیوری آفر!',COALESCE(NEW.pickup_name,'دکان'),' /rider-dashboard'); END IF;
 END IF; RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.dispatch_next_rider(_kind text,_order_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
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
 INSERT INTO delivery_offers(order_id,order_kind,rider_id,distance_km,pickup_name,dropoff_address,total_amount,delivery_fee,expires_at) SELECT _order_id,_kind,rd.id,CASE WHEN plat IS NULL THEN NULL ELSE haversine_km(r.current_lat,r.current_lng,plat,plng) END,o.pickup,o.delivery_address,o.total_amount,COALESCE(o.delivery_fee,0),now()+make_interval(secs=>CASE WHEN tries=0 THEN 30 ELSE 40 END) FROM riders r WHERE r.id=rd.id RETURNING id INTO offer;
 EXCEPTION WHEN OTHERS THEN offer:=NULL; END;
 EXIT WHEN offer IS NOT NULL;
 END LOOP; END IF;
 IF _kind='food' THEN UPDATE orders SET dispatch_state=CASE WHEN offer IS NOT NULL THEN 'offered' ELSE 'stuck' END WHERE id=_order_id;
 ELSIF _kind='grocery_cart' THEN UPDATE grocery_cart_orders SET dispatch_state=CASE WHEN offer IS NOT NULL THEN 'offered' ELSE 'stuck' END WHERE id=_order_id;
 ELSE UPDATE grocery_list_orders SET dispatch_state=CASE WHEN offer IS NOT NULL THEN 'offered' ELSE 'stuck' END WHERE id=_order_id; END IF;
 RETURN offer;
END $$;
CREATE OR REPLACE FUNCTION public.accept_delivery_offer(_offer_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o delivery_offers%ROWTYPE; claimed int;
BEGIN
 IF auth.uid() IS NULL OR NOT has_role(auth.uid(),'rider') THEN RAISE EXCEPTION 'رائیڈر کی اجازت ضروری ہے'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('rider-capacity:'||auth.uid()::text,0));
 SELECT * INTO o FROM delivery_offers WHERE id=_offer_id FOR UPDATE;
 IF o.id IS NULL OR o.rider_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'یہ آفر آپ کی نہیں'; END IF;
 IF o.status='accepted' THEN RETURN; END IF;
 IF o.status<>'offered' OR o.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'آفر کا وقت ختم ہو چکا'; END IF;
 IF NOT rider_dispatch_idle(o.rider_id,o.order_kind,o.order_id) OR NOT delivery_dispatch_ready(o.order_kind,o.order_id) THEN RAISE EXCEPTION 'رائیڈر مصروف یا آرڈر تیار نہیں؛ آفر قبول نہیں ہو سکتی'; END IF;
 PERFORM set_config('app.bypass_order_guard','on',true);
 IF o.order_kind='food' THEN UPDATE orders SET rider_id=o.rider_id,dispatch_state='assigned' WHERE id=o.order_id AND rider_id IS NULL;
 ELSIF o.order_kind='grocery_cart' THEN UPDATE grocery_cart_orders SET rider_id=o.rider_id,rider_assigned_at=now(),dispatch_state='assigned' WHERE id=o.order_id AND rider_id IS NULL;
 ELSE UPDATE grocery_list_orders SET rider_id=o.rider_id,rider_assigned_at=now(),dispatch_state='assigned' WHERE id=o.order_id AND rider_id IS NULL; END IF;
 GET DIAGNOSTICS claimed=ROW_COUNT;
 IF claimed<>1 THEN RAISE EXCEPTION 'آرڈر کسی دوسرے رائیڈر کو مل چکا ہے'; END IF;
 UPDATE delivery_offers SET status='accepted',responded_at=now() WHERE id=o.id;
 UPDATE delivery_offers SET status='cancelled',responded_at=now() WHERE status='offered' AND id<>o.id AND ((order_kind=o.order_kind AND order_id=o.order_id) OR rider_id=o.rider_id);
 PERFORM set_config('app.bypass_order_guard','off',true);
END $$;
CREATE OR REPLACE FUNCTION public.after_order_status_dispatch() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.rider_id IS NULL AND delivery_dispatch_ready(TG_ARGV[0],NEW.id) THEN
 IF TG_OP='INSERT' THEN PERFORM dispatch_next_rider(TG_ARGV[0],NEW.id);
 ELSIF OLD.status IS DISTINCT FROM NEW.status THEN PERFORM dispatch_next_rider(TG_ARGV[0],NEW.id); END IF;
 END IF; RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.delivery_dispatch_ready(text,uuid),public.rider_dispatch_idle(uuid,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.delivery_dispatch_ready(text,uuid),public.rider_dispatch_idle(uuid,text,uuid) TO service_role;