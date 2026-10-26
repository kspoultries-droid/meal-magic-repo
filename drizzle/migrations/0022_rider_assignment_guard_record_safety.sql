CREATE OR REPLACE FUNCTION public.guard_safe_rider_assignment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE k text; oid uuid; c uuid; w numeric; pm text; amount numeric; r public.riders%ROWTYPE;
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
 IF NOT public.rider_dispatch_idle(NEW.rider_id,k,oid) THEN RAISE EXCEPTION 'رائیڈر مصروف، آف لائن یا مقام پرانا ہے؛ پہلے جاری ڈیلیوری مکمل کریں'; END IF;
 IF NOT public.delivery_dispatch_ready(k,oid) THEN RAISE EXCEPTION 'آرڈر ابھی پک اَپ کے لیے تیار نہیں'; END IF;
 IF k='food' THEN SELECT city_id,COALESCE(billable_weight_kg,0),payment_method,total_amount INTO c,w,pm,amount FROM orders WHERE id=oid;
 ELSIF k='grocery_cart' THEN SELECT city_id,COALESCE(billable_weight_kg,0),payment_method,COALESCE(final_amount,total_amount) INTO c,w,pm,amount FROM grocery_cart_orders WHERE id=oid;
 ELSE SELECT s.city_id,0,o.payment_method,o.total_amount INTO c,w,pm,amount FROM grocery_list_orders o JOIN grocery_stores s ON s.id=o.store_id WHERE o.id=oid; END IF;
 SELECT * INTO r FROM riders WHERE id=NEW.rider_id;
 IF c IS NOT NULL AND r.city_id IS DISTINCT FROM c THEN RAISE EXCEPTION 'رائیڈر اسی شہر کا ہونا ضروری ہے'; END IF;
 IF COALESCE(r.capacity_kg,(SELECT capacity_kg FROM vehicle_types WHERE id=r.vehicle_type_id),15)<w THEN RAISE EXCEPTION 'رائیڈر کی وزن گنجائش ناکافی ہے'; END IF;
 IF lower(COALESCE(pm,'cod'))='cod' AND public.rider_cash_outstanding(r.id)+COALESCE(amount,0)>public.rider_cash_limit() THEN RAISE EXCEPTION 'رائیڈر کی نقد حد پوری ہو چکی ہے'; END IF;
 IF TG_TABLE_NAME='delivery_offers' THEN NEW.is_batch:=false; END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.notify_offer_events() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.status='offered' AND NEW.expires_at>now() THEN
 IF TG_OP='INSERT' THEN PERFORM notify_user(NEW.rider_id,'offer','نئی ڈیلیوری آفر!',COALESCE(NEW.pickup_name,'دکان')||' — قبولیت کا انتظار','/rider-dashboard');
 ELSIF OLD.status IS DISTINCT FROM NEW.status THEN PERFORM notify_user(NEW.rider_id,'offer','نئی ڈیلیوری آفر!',COALESCE(NEW.pickup_name,'دکان'),'/rider-dashboard'); END IF;
 END IF; RETURN NEW;
END $$;