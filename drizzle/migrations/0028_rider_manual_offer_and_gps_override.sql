ALTER TABLE public.delivery_offers ADD COLUMN IF NOT EXISTS manual boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION public.guard_safe_rider_assignment()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
 IF TG_TABLE_NAME='delivery_offers' AND k='food' AND auth.uid() IS NOT NULL AND public.is_staff(auth.uid()) AND EXISTS(SELECT 1 FROM orders WHERE id=oid AND status IN ('confirmed','preparing','delivering')) THEN NEW.manual:=true;
 ELSIF NOT public.delivery_dispatch_ready(k,oid) THEN RAISE EXCEPTION 'آرڈر ابھی پک اَپ کے لیے تیار نہیں'; END IF;
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

CREATE OR REPLACE FUNCTION public.delivery_dispatch_ready(_kind text, _id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
SELECT CASE _kind
 WHEN 'food' THEN EXISTS(SELECT 1 FROM orders o WHERE o.id=_id AND o.status IN ('confirmed','preparing','delivering') AND COALESCE(o.delivery_mode_calc,'rider') NOT IN ('courier','intercity') AND (o.status='delivering' OR COALESCE(o.ready_at,COALESCE(o.accepted_at,o.created_at)+make_interval(mins=>COALESCE(o.prep_minutes,15)))<=now()+interval '8 minutes' OR EXISTS(SELECT 1 FROM delivery_offers d WHERE d.order_id=o.id AND d.order_kind='food' AND d.manual AND d.status IN ('offered','accepted'))))
 WHEN 'grocery_cart' THEN EXISTS(SELECT 1 FROM grocery_cart_orders o WHERE o.id=_id AND o.status IN ('ready_for_pickup','ready') AND COALESCE(o.delivery_method,'local_rider')<>'courier' AND COALESCE(o.delivery_mode_calc,'rider') NOT IN ('courier','intercity') AND NOT EXISTS(SELECT 1 FROM grocery_order_items i WHERE i.order_id=o.id AND i.approval_status='pending_customer'))
 WHEN 'grocery_list' THEN EXISTS(SELECT 1 FROM grocery_list_orders o WHERE o.id=_id AND o.status IN ('ready_for_pickup','ready') AND o.total_amount IS NOT NULL AND o.total_amount>0)
 ELSE false END;
$function$;

CREATE OR REPLACE FUNCTION public.rider_delivery_action(_kind text, _order_id uuid, _action text, _lat double precision DEFAULT NULL::double precision, _lng double precision DEFAULT NULL::double precision, _cash numeric DEFAULT NULL::numeric, _reason text DEFAULT NULL::text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE tbl text; o record; destlat double precision; destlng double precision; expected numeric; newstatus text; newstage text;
BEGIN
 IF auth.uid() IS NULL OR NOT has_role(auth.uid(),'rider') THEN RAISE EXCEPTION 'رائیڈر کی اجازت ضروری ہے'; END IF;
 tbl:=CASE _kind WHEN 'food' THEN 'orders' WHEN 'grocery_cart' THEN 'grocery_cart_orders' WHEN 'grocery_list' THEN 'grocery_list_orders' END;
 IF tbl IS NULL THEN RAISE EXCEPTION 'غلط آرڈر قسم'; END IF;
 EXECUTE format('SELECT *,COALESCE((to_jsonb(t)->>''final_amount'')::numeric,total_amount,0) payable FROM public.%I t WHERE id=$1 FOR UPDATE',tbl) INTO o USING _order_id;
 IF o.id IS NULL OR o.rider_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'یہ آرڈر آپ کا نہیں'; END IF;
 IF o.status IN ('delivered','completed','cancelled','returned_to_store') THEN IF _action='deliver' AND o.delivery_stage='delivered' THEN RETURN; END IF; RAISE EXCEPTION 'آرڈر بند ہو چکا ہے'; END IF;
 PERFORM set_config('app.rider_lifecycle','on',true); PERFORM set_config('app.bypass_order_guard','on',true);
 IF _action IN ('arrived_pickup','arrived_customer') THEN
 IF _action='arrived_customer' AND o.delivery_stage NOT IN ('picked_up','arrived_customer') THEN RAISE EXCEPTION 'پہلے سامان اٹھانا درج کریں'; END IF;
 IF _action='arrived_pickup' AND o.delivery_stage NOT IN ('assigned','arrived_pickup') THEN RAISE EXCEPTION 'یہ مرحلہ گزر چکا ہے'; END IF;
 IF _action='arrived_customer' THEN destlat:=o.delivery_lat; destlng:=o.delivery_lng;
 ELSIF _kind='food' THEN SELECT pickup_lat,pickup_lng INTO destlat,destlng FROM restaurants WHERE id=o.restaurant_id; END IF;
 IF destlat IS NOT NULL AND destlng IS NOT NULL THEN
 IF _lat IS NULL OR _lng IS NULL OR _lat NOT BETWEEN -90 AND 90 OR _lng NOT BETWEEN -180 AND 180 THEN RAISE EXCEPTION 'تازہ GPS ضروری ہے'; END IF;
 IF haversine_km(_lat,_lng,destlat,destlng)>0.15 THEN
 IF _action='arrived_customer' AND length(trim(COALESCE(_reason,'')))>=3 THEN
 INSERT INTO order_events(order_id,order_type,event_type,from_value,to_value,actor_id,source,note) VALUES(_order_id,_kind,'status',o.delivery_stage,'arrived_customer',auth.uid(),'rider',left('GPS override '||round(haversine_km(_lat,_lng,destlat,destlng)::numeric,2)||' km: '||_reason,500));
 ELSE RAISE EXCEPTION 'مقام سے 150 میٹر کے اندر پہنچ کر دبائیں'; END IF; END IF; END IF;
 EXECUTE format('UPDATE public.%I SET delivery_stage=$2,%I=COALESCE(%I,now()) WHERE id=$1',tbl,CASE WHEN _action='arrived_pickup' THEN 'rider_arrived_at' ELSE 'arrived_customer_at' END,CASE WHEN _action='arrived_pickup' THEN 'rider_arrived_at' ELSE 'arrived_customer_at' END) USING _order_id,_action;
 ELSIF _action='pickup' THEN
 IF o.delivery_stage='picked_up' THEN RETURN; END IF;
 IF o.delivery_stage<>'arrived_pickup' OR NOT ((_kind='food' AND o.status='delivering') OR (_kind<>'food' AND delivery_dispatch_ready(_kind,_order_id))) THEN RAISE EXCEPTION 'دکان پر پہنچنا اور سامان تیار ہونا ضروری ہے'; END IF;
 EXECUTE format('UPDATE public.%I SET delivery_stage=''picked_up'',picked_up_at=now(),status=''delivering'' WHERE id=$1',tbl) USING _order_id;
 ELSIF _action='deliver' THEN
 IF o.delivery_stage<>'arrived_customer' OR o.picked_up_at IS NULL THEN RAISE EXCEPTION 'پہلے پک اَپ اور کسٹمر تک پہنچنا درج کریں'; END IF;
 expected:=CASE WHEN lower(COALESCE(o.payment_method,'cod'))='cod' THEN o.payable ELSE 0 END;
 IF _cash IS NULL OR round(_cash,2)<>round(expected,2) OR _cash<0 THEN RAISE EXCEPTION 'وصولی Rs % ہونی چاہیے؛ فرق ہو تو مسئلہ درج کریں',expected; END IF;
 EXECUTE format('UPDATE public.%I SET delivery_stage=''delivered'',cash_received=$2,cash_received_at=now(),status=''delivered'',delivered_at=now() WHERE id=$1',tbl) USING _order_id,_cash;
 ELSIF _action='fail' THEN
 IF length(trim(COALESCE(_reason,'')))<3 THEN RAISE EXCEPTION 'ناکامی کی وجہ درج کریں'; END IF;
 IF o.picked_up_at IS NULL THEN RAISE EXCEPTION 'پک اَپ سے پہلے مدد کے لیے سپورٹ سے رابطہ کریں'; END IF;
 IF o.delivery_stage='return_pending' THEN RETURN; END IF;
 EXECUTE format('UPDATE public.%I SET delivery_stage=''return_pending'',return_requested_at=now(),delivery_failure_reason=$2 WHERE id=$1',tbl) USING _order_id,left(_reason,500);
 INSERT INTO order_events(order_id,order_type,event_type,from_value,to_value,actor_id,source,note) VALUES(_order_id,_kind,'status',o.delivery_stage,'return_pending',auth.uid(),'rider',left(_reason,500));
 PERFORM notify_user(o.customer_id,'delivery','ڈیلیوری میں مسئلہ','سپورٹ آپ کی ڈیلیوری کی نگرانی کر رہی ہے','/order-tracking/'||_order_id||CASE WHEN _kind='food' THEN '' WHEN _kind='grocery_list' THEN '?type=grocery_list' ELSE '?type=grocery' END);
 ELSE RAISE EXCEPTION 'غلط کارروائی'; END IF;
 PERFORM set_config('app.rider_lifecycle','off',true); PERFORM set_config('app.bypass_order_guard','off',true);
END $function$;