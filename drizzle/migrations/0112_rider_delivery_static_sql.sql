CREATE OR REPLACE FUNCTION public.rider_delivery_action(_kind text, _order_id uuid, _action text, _lat double precision DEFAULT NULL::double precision, _lng double precision DEFAULT NULL::double precision, _cash numeric DEFAULT NULL::numeric, _reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE tbl text; o record; destlat double precision; destlng double precision; expected numeric; newstatus text; newstage text;
BEGIN
 IF auth.uid() IS NULL OR NOT has_role(auth.uid(),'rider') THEN RAISE EXCEPTION 'رائیڈر کی اجازت ضروری ہے'; END IF;
 tbl:=CASE _kind WHEN 'food' THEN 'orders' WHEN 'grocery_cart' THEN 'grocery_cart_orders' WHEN 'grocery_list' THEN 'grocery_list_orders' END;
 IF tbl IS NULL THEN RAISE EXCEPTION 'غلط آرڈر قسم'; END IF;
 IF _kind='food' THEN SELECT *,COALESCE((to_jsonb(t)->>'final_amount')::numeric,total_amount,0) payable INTO o FROM public.orders t WHERE id=(_order_id) FOR UPDATE; ELSIF _kind='grocery_cart' THEN SELECT *,COALESCE((to_jsonb(t)->>'final_amount')::numeric,total_amount,0) payable INTO o FROM public.grocery_cart_orders t WHERE id=(_order_id) FOR UPDATE; ELSIF _kind='grocery_list' THEN SELECT *,COALESCE((to_jsonb(t)->>'final_amount')::numeric,total_amount,0) payable INTO o FROM public.grocery_list_orders t WHERE id=(_order_id) FOR UPDATE; END IF;
 IF o.id IS NULL OR o.rider_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'یہ آرڈر آپ کا نہیں'; END IF;
 IF o.status IN ('delivered','completed','cancelled','returned_to_store') THEN IF _action='deliver' AND o.delivery_stage='delivered' THEN RETURN; END IF; RAISE EXCEPTION 'آرڈر بند ہو چکا ہے'; END IF;
 PERFORM set_config('app.rider_lifecycle','on',true); PERFORM set_config('app.bypass_order_guard','on',true);
 IF _action IN ('arrived_pickup','arrived_customer') THEN
 IF _action='arrived_customer' AND o.delivery_stage NOT IN ('picked_up','arrived_customer') THEN RAISE EXCEPTION 'پہلے سامان اٹھانا درج کریں'; END IF;
 IF _action='arrived_pickup' AND o.delivery_stage NOT IN ('assigned','arrived_pickup') THEN RAISE EXCEPTION 'یہ مرحلہ گزر چکا ہے'; END IF;
 IF _action='arrived_customer' THEN destlat:=o.delivery_lat; destlng:=o.delivery_lng;
 ELSIF _kind='food' THEN SELECT pickup_lat,pickup_lng INTO destlat,destlng FROM restaurants WHERE id=o.restaurant_id; ELSE SELECT pickup_lat,pickup_lng INTO destlat,destlng FROM grocery_stores WHERE id=o.store_id; END IF;
 IF destlat IS NOT NULL AND destlng IS NOT NULL THEN
 IF _lat IS NULL OR _lng IS NULL OR _lat NOT BETWEEN -90 AND 90 OR _lng NOT BETWEEN -180 AND 180 THEN RAISE EXCEPTION 'تازہ GPS ضروری ہے'; END IF;
 IF haversine_km(_lat,_lng,destlat,destlng)>0.15 THEN
 IF _action='arrived_customer' AND length(trim(COALESCE(_reason,'')))>=3 THEN
 INSERT INTO order_events(order_id,order_type,event_type,from_value,to_value,actor_id,source,note) VALUES(_order_id,_kind,'status',o.delivery_stage,'arrived_customer',auth.uid(),'rider',left('GPS override '||round(haversine_km(_lat,_lng,destlat,destlng)::numeric,2)||' km: '||_reason,500));
 ELSE RAISE EXCEPTION 'مقام سے 150 میٹر کے اندر پہنچ کر دبائیں'; END IF; END IF; END IF;
 IF _action='arrived_pickup' THEN IF _kind='food' THEN UPDATE public.orders SET delivery_stage=_action,rider_arrived_at=COALESCE(rider_arrived_at,now()) WHERE id=_order_id; ELSIF _kind='grocery_cart' THEN UPDATE public.grocery_cart_orders SET delivery_stage=_action,rider_arrived_at=COALESCE(rider_arrived_at,now()) WHERE id=_order_id; ELSIF _kind='grocery_list' THEN UPDATE public.grocery_list_orders SET delivery_stage=_action,rider_arrived_at=COALESCE(rider_arrived_at,now()) WHERE id=_order_id; END IF; ELSE IF _kind='food' THEN UPDATE public.orders SET delivery_stage=_action,arrived_customer_at=COALESCE(arrived_customer_at,now()) WHERE id=_order_id; ELSIF _kind='grocery_cart' THEN UPDATE public.grocery_cart_orders SET delivery_stage=_action,arrived_customer_at=COALESCE(arrived_customer_at,now()) WHERE id=_order_id; ELSIF _kind='grocery_list' THEN UPDATE public.grocery_list_orders SET delivery_stage=_action,arrived_customer_at=COALESCE(arrived_customer_at,now()) WHERE id=_order_id; END IF; END IF;
 ELSIF _action='pickup' THEN
 IF o.delivery_stage='picked_up' THEN RETURN; END IF;
 IF o.delivery_stage<>'arrived_pickup' OR NOT ((_kind='food' AND o.status='delivering') OR (_kind<>'food' AND delivery_dispatch_ready(_kind,_order_id))) THEN RAISE EXCEPTION 'دکان پر پہنچنا اور سامان تیار ہونا ضروری ہے'; END IF;
 IF _kind='food' THEN UPDATE public.orders SET delivery_stage='picked_up',picked_up_at=now(),status='delivering' WHERE id=(_order_id); ELSIF _kind='grocery_cart' THEN UPDATE public.grocery_cart_orders SET delivery_stage='picked_up',picked_up_at=now(),status='delivering' WHERE id=(_order_id); ELSIF _kind='grocery_list' THEN UPDATE public.grocery_list_orders SET delivery_stage='picked_up',picked_up_at=now(),status='delivering' WHERE id=(_order_id); END IF;
 ELSIF _action='deliver' THEN
 IF o.delivery_stage<>'arrived_customer' OR o.picked_up_at IS NULL THEN RAISE EXCEPTION 'پہلے پک اَپ اور کسٹمر تک پہنچنا درج کریں'; END IF;
 expected:=CASE WHEN lower(COALESCE(o.payment_method,'cod'))='cod' THEN o.payable ELSE 0 END;
 IF _cash IS NULL OR round(_cash,2)<>round(expected,2) OR _cash<0 THEN RAISE EXCEPTION 'وصولی Rs % ہونی چاہیے؛ فرق ہو تو مسئلہ درج کریں',expected; END IF;
 IF _kind='food' THEN UPDATE public.orders SET delivery_stage='delivered',cash_received=(_cash),cash_received_at=now(),status='delivered',delivered_at=now() WHERE id=(_order_id); ELSIF _kind='grocery_cart' THEN UPDATE public.grocery_cart_orders SET delivery_stage='delivered',cash_received=(_cash),cash_received_at=now(),status='delivered',delivered_at=now() WHERE id=(_order_id); ELSIF _kind='grocery_list' THEN UPDATE public.grocery_list_orders SET delivery_stage='delivered',cash_received=(_cash),cash_received_at=now(),status='delivered',delivered_at=now() WHERE id=(_order_id); END IF;
 ELSIF _action='fail' THEN
 IF length(trim(COALESCE(_reason,'')))<3 THEN RAISE EXCEPTION 'ناکامی کی وجہ درج کریں'; END IF;
 IF o.picked_up_at IS NULL THEN RAISE EXCEPTION 'پک اَپ سے پہلے مدد کے لیے سپورٹ سے رابطہ کریں'; END IF;
 IF o.delivery_stage='return_pending' THEN RETURN; END IF;
 IF _kind='food' THEN UPDATE public.orders SET delivery_stage='return_pending',return_requested_at=now(),delivery_failure_reason=(left(_reason,500)) WHERE id=(_order_id); ELSIF _kind='grocery_cart' THEN UPDATE public.grocery_cart_orders SET delivery_stage='return_pending',return_requested_at=now(),delivery_failure_reason=(left(_reason,500)) WHERE id=(_order_id); ELSIF _kind='grocery_list' THEN UPDATE public.grocery_list_orders SET delivery_stage='return_pending',return_requested_at=now(),delivery_failure_reason=(left(_reason,500)) WHERE id=(_order_id); END IF;
 INSERT INTO order_events(order_id,order_type,event_type,from_value,to_value,actor_id,source,note) VALUES(_order_id,_kind,'status',o.delivery_stage,'return_pending',auth.uid(),'rider',left(_reason,500));
 PERFORM notify_user(o.customer_id,'delivery','ڈیلیوری میں مسئلہ','سپورٹ آپ کی ڈیلیوری کی نگرانی کر رہی ہے','/order-tracking/'||_order_id||CASE WHEN _kind='food' THEN '' WHEN _kind='grocery_list' THEN '?type=grocery_list' ELSE '?type=grocery' END);
 ELSE RAISE EXCEPTION 'غلط کارروائی'; END IF;
 PERFORM set_config('app.rider_lifecycle','off',true); PERFORM set_config('app.bypass_order_guard','off',true);
END $function$;

CREATE OR REPLACE FUNCTION public.resolve_rider_return(_kind text, _order_id uuid, _note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE tbl text; o record;
BEGIN
IF NOT public.staff_order_allowed('dispatch',_kind,_order_id) THEN RAISE EXCEPTION 'Dispatch permission or city denied'; END IF;
 IF auth.uid() IS NULL OR NOT (has_permission(auth.uid(),'dispatch') OR has_role(auth.uid(),'support')) THEN RAISE EXCEPTION 'سپورٹ یا ڈسپیچ کی اجازت ضروری ہے'; END IF;
 IF length(trim(COALESCE(_note,'')))<3 THEN RAISE EXCEPTION 'واپسی کی تصدیق کا نوٹ ضروری ہے'; END IF;
 tbl:=CASE _kind WHEN 'food' THEN 'orders' WHEN 'grocery_cart' THEN 'grocery_cart_orders' WHEN 'grocery_list' THEN 'grocery_list_orders' END;
 IF tbl IS NULL THEN RAISE EXCEPTION 'غلط قسم'; END IF;
 IF _kind='food' THEN SELECT * INTO o FROM public.orders WHERE id=(_order_id) FOR UPDATE; ELSIF _kind='grocery_cart' THEN SELECT * INTO o FROM public.grocery_cart_orders WHERE id=(_order_id) FOR UPDATE; ELSIF _kind='grocery_list' THEN SELECT * INTO o FROM public.grocery_list_orders WHERE id=(_order_id) FOR UPDATE; END IF;
 IF o.delivery_stage='returned' THEN RETURN; END IF;
 IF o.delivery_stage IS DISTINCT FROM 'return_pending' THEN RAISE EXCEPTION 'واپسی زیرِنگرانی نہیں ہے'; END IF;
 PERFORM set_config('app.rider_lifecycle','on',true); PERFORM set_config('app.bypass_order_guard','on',true);
 IF _kind='food' THEN UPDATE public.orders SET returned_at=now(),delivery_stage='returned',status='cancelled' WHERE id=(_order_id); ELSIF _kind='grocery_cart' THEN UPDATE public.grocery_cart_orders SET returned_at=now(),delivery_stage='returned',status='returned_to_store' WHERE id=(_order_id); ELSIF _kind='grocery_list' THEN UPDATE public.grocery_list_orders SET returned_at=now(),delivery_stage='returned',status='returned_to_store' WHERE id=(_order_id); END IF;
 INSERT INTO order_events(order_id,order_type,event_type,from_value,to_value,actor_id,source,note) VALUES(_order_id,_kind,'status','return_pending','returned',auth.uid(),'dispatch',left(_note,500));
 PERFORM notify_user(o.rider_id,'return','واپسی کی تصدیق ہو گئی','سامان کی واپسی درج؛ اب نئی ڈیلیوری مل سکتی ہے','/rider-dashboard');
 PERFORM set_config('app.rider_lifecycle','off',true); PERFORM set_config('app.bypass_order_guard','off',true);
END $function$;

CREATE OR REPLACE FUNCTION public.staff_force_deliver(_kind text, _order_id uuid, _note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE tbl text; o record; expected numeric;
BEGIN
 IF NOT public.staff_order_allowed('dispatch',_kind,_order_id) THEN RAISE EXCEPTION 'ڈسپیچ کی اجازت یا شہر کی رسائی نہیں'; END IF;
 IF length(trim(coalesce(_note,'')))<3 THEN RAISE EXCEPTION 'تصدیق کا نوٹ ضروری ہے'; END IF;
 tbl:=CASE _kind WHEN 'food' THEN 'orders' WHEN 'grocery_cart' THEN 'grocery_cart_orders' WHEN 'grocery_list' THEN 'grocery_list_orders' END;
 IF tbl IS NULL THEN RAISE EXCEPTION 'غلط آرڈر قسم'; END IF;
 IF _kind='food' THEN SELECT *,COALESCE((to_jsonb(t)->>'final_amount')::numeric,total_amount,0) payable INTO o FROM public.orders t WHERE id=(_order_id) FOR UPDATE; ELSIF _kind='grocery_cart' THEN SELECT *,COALESCE((to_jsonb(t)->>'final_amount')::numeric,total_amount,0) payable INTO o FROM public.grocery_cart_orders t WHERE id=(_order_id) FOR UPDATE; ELSIF _kind='grocery_list' THEN SELECT *,COALESCE((to_jsonb(t)->>'final_amount')::numeric,total_amount,0) payable INTO o FROM public.grocery_list_orders t WHERE id=(_order_id) FOR UPDATE; END IF;
 IF o.id IS NULL OR o.status IN ('delivered','completed','cancelled','returned_to_store') THEN RAISE EXCEPTION 'آرڈر پہلے ہی بند ہے'; END IF;
 IF o.rider_id IS NULL OR o.picked_up_at IS NULL THEN RAISE EXCEPTION 'رائیڈر نے سامان نہیں اٹھایا؛ منسوخ کریں'; END IF;
 IF o.delivery_stage='return_pending' THEN RAISE EXCEPTION 'واپسی زیرِنگرانی ہے؛ پہلے واپسی حل کریں'; END IF;
 expected:=CASE WHEN lower(COALESCE(o.payment_method,'cod'))='cod' THEN o.payable ELSE 0 END;
 PERFORM set_config('app.rider_lifecycle','on',true); PERFORM set_config('app.bypass_order_guard','on',true);
 IF _kind='food' THEN UPDATE public.orders SET delivery_stage='delivered',arrived_customer_at=COALESCE(arrived_customer_at,now()),cash_received=expected,cash_received_at=now(),status='delivered',delivered_at=now() WHERE id=(_order_id); ELSIF _kind='grocery_cart' THEN UPDATE public.grocery_cart_orders SET delivery_stage='delivered',arrived_customer_at=COALESCE(arrived_customer_at,now()),cash_received=expected,cash_received_at=now(),status='delivered',delivered_at=now() WHERE id=(_order_id); ELSIF _kind='grocery_list' THEN UPDATE public.grocery_list_orders SET delivery_stage='delivered',arrived_customer_at=COALESCE(arrived_customer_at,now()),cash_received=expected,cash_received_at=now(),status='delivered',delivered_at=now() WHERE id=(_order_id); END IF;
 PERFORM set_config('app.rider_lifecycle','off',true); PERFORM set_config('app.bypass_order_guard','off',true);
 INSERT INTO order_events(order_id,order_type,event_type,from_value,to_value,actor_id,source,note) VALUES(_order_id,_kind,'status',o.status,'delivered',auth.uid(),'dispatch',left('Staff confirmed delivery: '||trim(_note),500));
 INSERT INTO public.staff_audit_log(actor_id,action,entity_type,entity_id,details) VALUES(auth.uid(),'force_deliver',tbl,_order_id::text,jsonb_build_object('note',trim(_note),'cash',expected));
END $function$;