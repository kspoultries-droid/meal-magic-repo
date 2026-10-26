CREATE OR REPLACE FUNCTION public.rider_operations_report(_days integer DEFAULT 7) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT (has_permission(auth.uid(),'dispatch') OR has_role(auth.uid(),'support') OR has_permission(auth.uid(),'finance')) THEN RAISE EXCEPTION 'نگرانی کی اجازت ضروری ہے'; END IF;
 WITH o AS (
 SELECT 'food' kind,id,status,rider_id,delivery_stage,delivery_failure_reason,return_requested_at,created_at,ready_at,rider_arrived_at,picked_up_at,arrived_customer_at,delivered_at,cash_received,COALESCE(total_amount,0) total,payment_method FROM orders WHERE created_at>=now()-make_interval(days=>LEAST(GREATEST(_days,1),30))
 UNION ALL SELECT 'grocery_cart',id,status,rider_id,delivery_stage,delivery_failure_reason,return_requested_at,created_at,ready_at,rider_arrived_at,picked_up_at,arrived_customer_at,delivered_at,cash_received,COALESCE(final_amount,total_amount,0),payment_method FROM grocery_cart_orders WHERE created_at>=now()-make_interval(days=>LEAST(GREATEST(_days,1),30))
 UNION ALL SELECT 'grocery_list',id,status,rider_id,delivery_stage,delivery_failure_reason,return_requested_at,created_at,ready_at,rider_arrived_at,picked_up_at,arrived_customer_at,delivered_at,cash_received,COALESCE(total_amount,0),payment_method FROM grocery_list_orders WHERE created_at>=now()-make_interval(days=>LEAST(GREATEST(_days,1),30))
 ), f AS (SELECT status,count(*) n FROM delivery_offers WHERE created_at>=now()-make_interval(days=>LEAST(GREATEST(_days,1),30)) GROUP BY status),r AS(SELECT order_kind,order_id,id,rider_id,status,distance_km FROM rider_earnings WHERE status='needs_review')
 SELECT jsonb_build_object('mode','supervised_single','period_days',LEAST(GREATEST(_days,1),30),'offers',COALESCE((SELECT jsonb_object_agg(status,n) FROM f),'{}'::jsonb),'pickup_wait_minutes',(SELECT round(avg(extract(epoch FROM picked_up_at-rider_arrived_at)/60)::numeric,1) FROM o WHERE picked_up_at>=rider_arrived_at),'ready_wait_minutes',(SELECT round(avg(extract(epoch FROM picked_up_at-ready_at)/60)::numeric,1) FROM o WHERE picked_up_at>=ready_at),'delivery_minutes',(SELECT round(avg(extract(epoch FROM delivered_at-picked_up_at)/60)::numeric,1) FROM o WHERE delivered_at>=picked_up_at),'cash_mismatches',(SELECT count(*) FROM o WHERE cash_received IS NOT NULL AND round(cash_received,2)<>round(CASE WHEN payment_method='cod' THEN total ELSE 0 END,2)),'accounting_reviews',(SELECT count(*) FROM r),'returns',COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT kind,id,rider_id,delivery_failure_reason,return_requested_at FROM o WHERE delivery_stage='return_pending' ORDER BY return_requested_at LIMIT 50) x),'[]'::jsonb),'review_rows',COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT * FROM r LIMIT 50) x),'[]'::jsonb),'services',COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT kind,count(*) orders,count(*) FILTER(WHERE status='cancelled') cancelled,count(*) FILTER(WHERE delivered_at IS NOT NULL) delivered,count(*) FILTER(WHERE status NOT IN ('delivered','completed','cancelled','returned_to_store') AND ready_at<now()-interval '10 minutes' AND picked_up_at IS NULL) waiting_over_10min FROM o GROUP BY kind) x),'[]'::jsonb)) INTO result;
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.review_rider_earning(_earning_id uuid,_distance_km numeric,_note text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE e rider_earnings%ROWTYPE; p rider_pay_plans%ROWTYPE; base numeric; dist numeric; total numeric;
BEGIN
 IF auth.uid() IS NULL OR NOT has_permission(auth.uid(),'finance') THEN RAISE EXCEPTION 'مالی اجازت ضروری ہے'; END IF;
 IF _distance_km IS NULL OR _distance_km<0 OR _distance_km>500 OR length(trim(COALESCE(_note,'')))<3 THEN RAISE EXCEPTION 'تصدیق شدہ فاصلہ اور نوٹ ضروری ہے'; END IF;
 SELECT * INTO e FROM rider_earnings WHERE id=_earning_id FOR UPDATE;
 IF e.id IS NULL OR e.status<>'needs_review' THEN RAISE EXCEPTION 'یہ کمائی جائزے کی منتظر نہیں'; END IF;
 SELECT * INTO p FROM rider_pay_plans WHERE is_active AND (rider_id=e.rider_id OR (rider_id IS NULL AND (city_id=(SELECT city_id FROM riders WHERE id=e.rider_id) OR city_id IS NULL))) ORDER BY (rider_id IS NOT NULL) DESC,(city_id IS NOT NULL) DESC,created_at DESC LIMIT 1;
 IF p.id IS NULL THEN RAISE EXCEPTION 'پہلے فعال پے پلان مقرر کریں'; END IF;
 base:=CASE WHEN p.pay_type='salaried' THEN 0 ELSE COALESCE(p.per_order_fee,0) END; dist:=round(COALESCE(p.per_km_fee,0)*_distance_km);
 total:=CASE WHEN p.pay_type='salaried' THEN dist ELSE GREATEST(COALESCE(p.min_order_pay,0),base+dist) END;
 UPDATE rider_earnings SET distance_km=_distance_km,base_pay=base,distance_pay=dist,amount=total,status='pending' WHERE id=e.id;
 PERFORM post_ledger_txn('rider_earning',e.order_kind,e.order_id,jsonb_build_array(jsonb_build_object('account','rider_pay_expense','party',e.rider_id::text,'direction','debit','amount',total),jsonb_build_object('account','rider_payable','party',e.rider_id::text,'direction','credit','amount',total)),left(_note,500));
 INSERT INTO order_events(order_id,order_type,event_type,actor_id,source,note) VALUES(e.order_id,e.order_kind,'earning_reviewed',auth.uid(),'finance',left(_note,500));
 PERFORM set_config('app.bypass_rider_guard','on',true);
 UPDATE riders SET total_earnings=(SELECT COALESCE(sum(amount),0) FROM rider_earnings WHERE rider_id=e.rider_id AND status NOT IN ('cancelled','needs_review')) WHERE id=e.rider_id;
 PERFORM set_config('app.bypass_rider_guard','off',true);
END $$;
CREATE OR REPLACE FUNCTION public.refresh_rider_acceptance() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 UPDATE riders r SET offers_received=(SELECT count(*) FROM delivery_offers d WHERE d.rider_id=NEW.rider_id AND d.status IN ('accepted','declined','expired')),offers_accepted=(SELECT count(*) FROM delivery_offers d WHERE d.rider_id=NEW.rider_id AND d.status='accepted'),acceptance_rate=COALESCE((SELECT round(count(*) FILTER(WHERE status='accepted')::numeric/NULLIF(count(*),0),3) FROM delivery_offers WHERE rider_id=NEW.rider_id AND status IN ('accepted','declined','expired')),1) WHERE r.id=NEW.rider_id;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.rider_operations_report(integer),public.review_rider_earning(uuid,numeric,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rider_operations_report(integer),public.review_rider_earning(uuid,numeric,text) TO authenticated,service_role;
COMMENT ON FUNCTION public.rider_operations_report(integer) IS 'Supervised pilot metrics separated by service; null timing means no measured journeys, not zero delay.';