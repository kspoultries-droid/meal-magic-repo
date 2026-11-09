CREATE OR REPLACE FUNCTION public.staff_force_deliver(_kind text, _order_id uuid, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $f$
DECLARE tbl text; o record; expected numeric;
BEGIN
 IF NOT public.staff_order_allowed('dispatch',_kind,_order_id) THEN RAISE EXCEPTION 'ڈسپیچ کی اجازت یا شہر کی رسائی نہیں'; END IF;
 IF length(trim(coalesce(_note,'')))<3 THEN RAISE EXCEPTION 'تصدیق کا نوٹ ضروری ہے'; END IF;
 tbl:=CASE _kind WHEN 'food' THEN 'orders' WHEN 'grocery_cart' THEN 'grocery_cart_orders' WHEN 'grocery_list' THEN 'grocery_list_orders' END;
 IF tbl IS NULL THEN RAISE EXCEPTION 'غلط آرڈر قسم'; END IF;
 EXECUTE format('SELECT *,COALESCE((to_jsonb(t)->>''final_amount'')::numeric,total_amount,0) payable FROM public.%I t WHERE id=$1 FOR UPDATE',tbl) INTO o USING _order_id;
 IF o.id IS NULL OR o.status IN ('delivered','completed','cancelled','returned_to_store') THEN RAISE EXCEPTION 'آرڈر پہلے ہی بند ہے'; END IF;
 IF o.rider_id IS NULL OR o.picked_up_at IS NULL THEN RAISE EXCEPTION 'رائیڈر نے سامان نہیں اٹھایا؛ منسوخ کریں'; END IF;
 IF o.delivery_stage='return_pending' THEN RAISE EXCEPTION 'واپسی زیرِنگرانی ہے؛ پہلے واپسی حل کریں'; END IF;
 expected:=CASE WHEN lower(COALESCE(o.payment_method,'cod'))='cod' THEN o.payable ELSE 0 END;
 PERFORM set_config('app.rider_lifecycle','on',true); PERFORM set_config('app.bypass_order_guard','on',true);
 EXECUTE format('UPDATE public.%I SET delivery_stage=''delivered'',arrived_customer_at=COALESCE(arrived_customer_at,now()),cash_received=$2,cash_received_at=now(),status=''delivered'',delivered_at=now() WHERE id=$1',tbl) USING _order_id,expected;
 PERFORM set_config('app.rider_lifecycle','off',true); PERFORM set_config('app.bypass_order_guard','off',true);
 INSERT INTO order_events(order_id,order_type,event_type,from_value,to_value,actor_id,source,note) VALUES(_order_id,_kind,'status',o.status,'delivered',auth.uid(),'dispatch',left('Staff confirmed delivery: '||trim(_note),500));
 INSERT INTO public.staff_audit_log(actor_id,action,entity_type,entity_id,details) VALUES(auth.uid(),'force_deliver',tbl,_order_id::text,jsonb_build_object('note',trim(_note),'cash',expected));
END $f$;
REVOKE ALL ON FUNCTION public.staff_force_deliver(text,uuid,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.staff_force_deliver(text,uuid,text) TO authenticated;