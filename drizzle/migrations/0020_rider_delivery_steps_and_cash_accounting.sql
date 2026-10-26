ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_stage text NOT NULL DEFAULT 'assigned', ADD COLUMN IF NOT EXISTS delivery_failure_reason text, ADD COLUMN IF NOT EXISTS return_requested_at timestamptz, ADD COLUMN IF NOT EXISTS returned_at timestamptz, ADD COLUMN IF NOT EXISTS cash_received numeric, ADD COLUMN IF NOT EXISTS cash_received_at timestamptz;
ALTER TABLE public.grocery_cart_orders ADD COLUMN IF NOT EXISTS delivery_stage text NOT NULL DEFAULT 'assigned', ADD COLUMN IF NOT EXISTS rider_arrived_at timestamptz, ADD COLUMN IF NOT EXISTS arrived_customer_at timestamptz, ADD COLUMN IF NOT EXISTS delivery_failure_reason text, ADD COLUMN IF NOT EXISTS return_requested_at timestamptz, ADD COLUMN IF NOT EXISTS returned_at timestamptz, ADD COLUMN IF NOT EXISTS cash_received numeric, ADD COLUMN IF NOT EXISTS cash_received_at timestamptz;
ALTER TABLE public.grocery_list_orders ADD COLUMN IF NOT EXISTS delivery_stage text NOT NULL DEFAULT 'assigned', ADD COLUMN IF NOT EXISTS accepted_at timestamptz, ADD COLUMN IF NOT EXISTS ready_at timestamptz, ADD COLUMN IF NOT EXISTS picked_up_at timestamptz, ADD COLUMN IF NOT EXISTS rider_arrived_at timestamptz, ADD COLUMN IF NOT EXISTS arrived_customer_at timestamptz, ADD COLUMN IF NOT EXISTS delivered_at timestamptz, ADD COLUMN IF NOT EXISTS cancelled_at timestamptz, ADD COLUMN IF NOT EXISTS delivery_failure_reason text, ADD COLUMN IF NOT EXISTS return_requested_at timestamptz, ADD COLUMN IF NOT EXISTS returned_at timestamptz, ADD COLUMN IF NOT EXISTS cash_received numeric, ADD COLUMN IF NOT EXISTS cash_received_at timestamptz;
CREATE OR REPLACE FUNCTION public.stamp_order_lifecycle() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.status IN ('confirmed','preparing') AND NEW.accepted_at IS NULL THEN NEW.accepted_at:=now(); END IF;
 IF NEW.status IN ('ready','ready_for_pickup') AND NEW.ready_at IS NULL THEN NEW.ready_at:=now(); END IF;
 IF NEW.status IN ('delivered','completed') AND NEW.delivered_at IS NULL THEN NEW.delivered_at:=now(); END IF;
 IF NEW.status='cancelled' AND NEW.cancelled_at IS NULL THEN NEW.cancelled_at:=now(); END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.guard_rider_delivery_lifecycle() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE trusted boolean:=COALESCE(current_setting('app.rider_lifecycle',true),'')='on';
BEGIN
 IF NOT trusted AND (NEW.delivery_stage IS DISTINCT FROM OLD.delivery_stage OR NEW.cash_received IS DISTINCT FROM OLD.cash_received OR NEW.cash_received_at IS DISTINCT FROM OLD.cash_received_at OR NEW.returned_at IS DISTINCT FROM OLD.returned_at OR NEW.return_requested_at IS DISTINCT FROM OLD.return_requested_at OR NEW.picked_up_at IS DISTINCT FROM OLD.picked_up_at OR NEW.rider_arrived_at IS DISTINCT FROM OLD.rider_arrived_at OR NEW.arrived_customer_at IS DISTINCT FROM OLD.arrived_customer_at) THEN RAISE EXCEPTION 'ڈیلیوری کا مرحلہ مقررہ کارروائی سے درج کریں'; END IF;
 IF OLD.status IN ('delivered','completed') AND NEW.status NOT IN ('delivered','completed') THEN RAISE EXCEPTION 'مکمل آرڈر کا حساب واپسی کے نام پر خودکار تبدیل نہیں ہو سکتا؛ مالی جائزہ ضروری ہے'; END IF;
 IF NEW.rider_id IS NOT NULL AND NEW.status IS DISTINCT FROM OLD.status THEN
 IF NEW.status IN ('delivered','completed') AND OLD.status NOT IN ('delivered','completed') AND (NOT trusted OR NEW.delivery_stage<>'delivered' OR NEW.arrived_customer_at IS NULL OR NEW.cash_received_at IS NULL) THEN RAISE EXCEPTION 'پک اَپ، دروازے پر پہنچنا اور وصولی پہلے درج کریں'; END IF;
 IF NEW.status IN ('cancelled','returned_to_store') AND OLD.picked_up_at IS NOT NULL AND NEW.returned_at IS NULL THEN RAISE EXCEPTION 'سامان رائیڈر کے پاس ہے؛ پہلے زیرِنگرانی واپسی مکمل کریں'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER z_guard_food_delivery_lifecycle BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.guard_rider_delivery_lifecycle();
CREATE TRIGGER z_guard_cart_delivery_lifecycle BEFORE UPDATE ON public.grocery_cart_orders FOR EACH ROW EXECUTE FUNCTION public.guard_rider_delivery_lifecycle();
CREATE TRIGGER z_guard_list_delivery_lifecycle BEFORE UPDATE ON public.grocery_list_orders FOR EACH ROW EXECUTE FUNCTION public.guard_rider_delivery_lifecycle();
CREATE OR REPLACE FUNCTION public.rider_delivery_action(_kind text,_order_id uuid,_action text,_lat double precision DEFAULT NULL,_lng double precision DEFAULT NULL,_cash numeric DEFAULT NULL,_reason text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
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
 IF haversine_km(_lat,_lng,destlat,destlng)>0.15 THEN RAISE EXCEPTION 'مقام سے 150 میٹر کے اندر پہنچ کر دبائیں'; END IF; END IF;
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
 INSERT INTO order_events(order_id,order_type,event_type,from_value,to_value,actor_id,source,note) VALUES(_order_id,_kind,'delivery_exception',o.delivery_stage,'return_pending',auth.uid(),'rider',left(_reason,500));
 PERFORM notify_user(o.customer_id,'delivery','ڈیلیوری میں مسئلہ','سپورٹ آپ کی ڈیلیوری کی نگرانی کر رہی ہے','/order/'||_order_id);
 ELSE RAISE EXCEPTION 'غلط کارروائی'; END IF;
 PERFORM set_config('app.rider_lifecycle','off',true); PERFORM set_config('app.bypass_order_guard','off',true);
END $$;
CREATE OR REPLACE FUNCTION public.rider_mark_step(_order_id uuid,_step text,_lat double precision DEFAULT NULL,_lng double precision DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN PERFORM rider_delivery_action('food',_order_id,_step,_lat,_lng); END $$;
CREATE OR REPLACE FUNCTION public.resolve_rider_return(_kind text,_order_id uuid,_note text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE tbl text; o record;
BEGIN
 IF auth.uid() IS NULL OR NOT (has_permission(auth.uid(),'dispatch') OR has_role(auth.uid(),'support')) THEN RAISE EXCEPTION 'سپورٹ یا ڈسپیچ کی اجازت ضروری ہے'; END IF;
 IF length(trim(COALESCE(_note,'')))<3 THEN RAISE EXCEPTION 'واپسی کی تصدیق کا نوٹ ضروری ہے'; END IF;
 tbl:=CASE _kind WHEN 'food' THEN 'orders' WHEN 'grocery_cart' THEN 'grocery_cart_orders' WHEN 'grocery_list' THEN 'grocery_list_orders' END;
 IF tbl IS NULL THEN RAISE EXCEPTION 'غلط قسم'; END IF;
 EXECUTE format('SELECT * FROM public.%I WHERE id=$1 FOR UPDATE',tbl) INTO o USING _order_id;
 IF o.delivery_stage='returned' THEN RETURN; END IF;
 IF o.delivery_stage IS DISTINCT FROM 'return_pending' THEN RAISE EXCEPTION 'واپسی زیرِنگرانی نہیں ہے'; END IF;
 PERFORM set_config('app.rider_lifecycle','on',true); PERFORM set_config('app.bypass_order_guard','on',true);
 EXECUTE format('UPDATE public.%I SET returned_at=now(),delivery_stage=''returned'',status=$2 WHERE id=$1',tbl) USING _order_id,CASE WHEN _kind='food' THEN 'cancelled' ELSE 'returned_to_store' END;
 INSERT INTO order_events(order_id,order_type,event_type,from_value,to_value,actor_id,source,note) VALUES(_order_id,_kind,'return_confirmed','return_pending','returned',auth.uid(),'dispatch',left(_note,500));
 PERFORM notify_user(o.rider_id,'return','واپسی کی تصدیق ہو گئی','سامان کی واپسی درج؛ اب نئی ڈیلیوری مل سکتی ہے','/rider-dashboard');
 PERFORM set_config('app.rider_lifecycle','off',true); PERFORM set_config('app.bypass_order_guard','off',true);
END $$;
CREATE OR REPLACE FUNCTION public.record_rider_earning(_kind text,_order_id uuid,_rider uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE k text; offer delivery_offers%ROWTYPE; p rider_pay_plans%ROWTYPE; base numeric; distpay numeric; amount numeric; state text;
BEGIN
 IF _rider IS NULL THEN RETURN; END IF;
 k:=CASE _kind WHEN 'grocery_cart_orders' THEN 'grocery_cart' WHEN 'grocery_list_orders' THEN 'grocery_list' ELSE _kind END;
 IF EXISTS(SELECT 1 FROM rider_earnings WHERE order_id=_order_id AND order_kind IN (k,_kind)) THEN RETURN; END IF;
 SELECT * INTO offer FROM delivery_offers WHERE order_kind=k AND order_id=_order_id AND rider_id=_rider AND status='accepted' ORDER BY created_at DESC LIMIT 1;
 p:=resolve_rider_pay(_rider);
 base:=CASE WHEN p.pay_type='salaried' THEN 0 ELSE COALESCE(p.per_order_fee,0) END;
 distpay:=ROUND(COALESCE(p.per_km_fee,0)*COALESCE(offer.earning_distance_km,0));
 amount:=COALESCE(offer.estimated_earning,0); state:=CASE WHEN offer.estimated_earning IS NULL THEN 'needs_review' ELSE 'pending' END;
 INSERT INTO rider_earnings(rider_id,order_kind,order_id,distance_km,base_pay,distance_pay,amount,status) VALUES(_rider,k,_order_id,offer.earning_distance_km,base,distpay,amount,state) ON CONFLICT(order_kind,order_id) DO NOTHING;
 PERFORM set_config('app.bypass_rider_guard','on',true);
 UPDATE riders SET total_earnings=(SELECT COALESCE(sum(e.amount),0) FROM rider_earnings e WHERE e.rider_id=_rider AND e.status NOT IN ('cancelled','needs_review')) WHERE id=_rider;
 PERFORM set_config('app.bypass_rider_guard','off',true);
END $$;
CREATE OR REPLACE FUNCTION public.settle_grocery_order_on_delivery() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE amt numeric; k text;
BEGIN
 IF NEW.status IN ('delivered','completed') AND OLD.status NOT IN ('delivered','completed') AND NEW.rider_id IS NOT NULL THEN
 amt:=COALESCE((to_jsonb(NEW)->>'final_amount')::numeric,NEW.total_amount,0);
 k:=CASE TG_TABLE_NAME WHEN 'grocery_cart_orders' THEN 'grocery_cart' ELSE 'grocery_list' END;
 IF lower(COALESCE(NEW.payment_method,'cod'))='cod' THEN
 PERFORM set_config('app.bypass_rider_guard','on',true);
 UPDATE riders SET wallet_balance=COALESCE(wallet_balance,0)+amt WHERE id=NEW.rider_id;
 PERFORM set_config('app.bypass_rider_guard','off',true);
 END IF;
 PERFORM record_rider_earning(k,NEW.id,NEW.rider_id);
 IF k='grocery_list' AND lower(COALESCE(NEW.payment_method,'cod'))='cod' AND amt>0 THEN INSERT INTO rider_cash_journal(rider_id,entry_type,order_kind,order_id,amount,note) VALUES(NEW.rider_id,'collected',k,NEW.id,amt,'Confirmed list delivery cash') ON CONFLICT DO NOTHING; END IF;
 END IF; RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.get_rider_summary() RETURNS TABLE(today_deliveries integer,today_earnings numeric,total_deliveries integer,total_earnings numeric,cash_collected numeric,remitted numeric,pending_remit numeric,cash_due numeric) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
WITH o AS (
 SELECT COALESCE(cash_received,CASE WHEN payment_method='cod' THEN total_amount ELSE 0 END) cash,COALESCE(delivered_at,updated_at) at FROM orders WHERE rider_id=auth.uid() AND status IN ('delivered','completed')
 UNION ALL SELECT COALESCE(cash_received,CASE WHEN payment_method='cod' THEN COALESCE(final_amount,total_amount) ELSE 0 END),COALESCE(delivered_at,updated_at) FROM grocery_cart_orders WHERE rider_id=auth.uid() AND status IN ('delivered','completed')
 UNION ALL SELECT COALESCE(cash_received,CASE WHEN payment_method='cod' THEN total_amount ELSE 0 END),COALESCE(delivered_at,updated_at) FROM grocery_list_orders WHERE rider_id=auth.uid() AND status IN ('delivered','completed')
),e AS(SELECT amount,created_at FROM rider_earnings WHERE rider_id=auth.uid() AND status NOT IN ('cancelled','needs_review')),r AS(SELECT COALESCE(sum(amount) FILTER(WHERE status='approved'),0) remitted,COALESCE(sum(amount) FILTER(WHERE status='pending'),0) pending FROM rider_remittances WHERE rider_id=auth.uid())
SELECT (SELECT count(*) FROM o WHERE (at AT TIME ZONE 'Asia/Karachi')::date=(now() AT TIME ZONE 'Asia/Karachi')::date)::int,(SELECT COALESCE(sum(amount),0) FROM e WHERE (created_at AT TIME ZONE 'Asia/Karachi')::date=(now() AT TIME ZONE 'Asia/Karachi')::date),(SELECT count(*) FROM o)::int,(SELECT COALESCE(sum(amount),0) FROM e),(SELECT COALESCE(sum(cash),0) FROM o),r.remitted,r.pending,GREATEST(0,(SELECT COALESCE(sum(cash),0) FROM o)-r.remitted-r.pending) FROM r;
$$;
CREATE OR REPLACE FUNCTION public.rider_cash_due(_rider uuid) RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE amt numeric;
BEGIN
 IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM _rider AND NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'support')) THEN RAISE EXCEPTION 'not authorized'; END IF;
 SELECT GREATEST(0,COALESCE(sum(cash),0)-(SELECT COALESCE(sum(amount),0) FROM rider_remittances WHERE rider_id=_rider AND status IN ('approved','pending'))) INTO amt FROM (
 SELECT COALESCE(cash_received,CASE WHEN payment_method='cod' THEN total_amount ELSE 0 END) cash FROM orders WHERE rider_id=_rider AND status IN ('delivered','completed') UNION ALL
 SELECT COALESCE(cash_received,CASE WHEN payment_method='cod' THEN COALESCE(final_amount,total_amount) ELSE 0 END) FROM grocery_cart_orders WHERE rider_id=_rider AND status IN ('delivered','completed') UNION ALL
 SELECT COALESCE(cash_received,CASE WHEN payment_method='cod' THEN total_amount ELSE 0 END) FROM grocery_list_orders WHERE rider_id=_rider AND status IN ('delivered','completed')) q;
 RETURN amt;
END $$;
CREATE OR REPLACE FUNCTION public.guard_rider_remittance() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE due numeric;
BEGIN
 IF auth.uid() IS NULL OR (NEW.rider_id IS DISTINCT FROM auth.uid() AND NOT has_role(auth.uid(),'admin')) THEN RAISE EXCEPTION 'صرف اپنی رقم جمع کرا سکتے ہیں'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('rider-remittance:'||NEW.rider_id::text,0));
 IF NEW.amount IS NULL OR NEW.amount<=0 THEN RAISE EXCEPTION 'درست رقم درج کریں'; END IF;
 IF NEW.account_id IS NULL OR NOT EXISTS(SELECT 1 FROM payment_accounts WHERE id=NEW.account_id AND is_active) THEN RAISE EXCEPTION 'فعال EasyLife اکاؤنٹ منتخب کریں'; END IF;
 IF EXISTS(SELECT 1 FROM rider_remittances WHERE rider_id=NEW.rider_id AND status='pending') THEN RAISE EXCEPTION 'ایک درخواست پہلے سے زیرِتصدیق ہے'; END IF;
 due:=rider_cash_due(NEW.rider_id);
 IF NEW.amount>due THEN RAISE EXCEPTION 'واجب الادا Rs % سے زیادہ جمع نہیں کرا سکتے',due; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.rider_delivery_action(text,uuid,text,double precision,double precision,numeric,text),public.resolve_rider_return(text,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rider_delivery_action(text,uuid,text,double precision,double precision,numeric,text),public.resolve_rider_return(text,uuid,text) TO authenticated,service_role;
COMMENT ON COLUMN public.orders.delivery_stage IS 'Rider physical journey, independent from kitchen preparation status; return_pending retains rider capacity until dispatcher confirms return.';