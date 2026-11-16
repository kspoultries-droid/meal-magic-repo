CREATE OR REPLACE FUNCTION public.staff_cancel_order(_kind text, _order_id uuid, _note text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$ DECLARE tbl text; o record; previous text; BEGIN
 IF NOT public.staff_order_allowed('support',_kind,_order_id) THEN RAISE EXCEPTION 'Cancellation permission or city denied'; END IF;
 IF length(trim(coalesce(_note,'')))<3 THEN RAISE EXCEPTION 'Cancellation reason required'; END IF;
 IF _kind='food' THEN tbl:='orders'; SELECT id,status,picked_up_at,return_requested_at INTO o FROM public.orders WHERE id=_order_id FOR UPDATE;
 ELSIF _kind='grocery_cart' THEN tbl:='grocery_cart_orders'; SELECT id,status,picked_up_at,return_requested_at INTO o FROM public.grocery_cart_orders WHERE id=_order_id FOR UPDATE;
 ELSIF _kind='grocery_list' THEN tbl:='grocery_list_orders'; SELECT id,status,picked_up_at,return_requested_at INTO o FROM public.grocery_list_orders WHERE id=_order_id FOR UPDATE;
 ELSE RAISE EXCEPTION 'Invalid order kind'; END IF;
 IF o.id IS NULL OR o.status IN ('delivered','completed','cancelled','returned_to_store','delivering','failed_delivery') OR o.picked_up_at IS NOT NULL OR o.return_requested_at IS NOT NULL THEN RAISE EXCEPTION 'Picked-up or closed order needs supervised resolution'; END IF;
 previous:=coalesce(current_setting('app.bypass_order_guard',true),''); PERFORM set_config('app.bypass_order_guard','on',true);
 IF _kind='food' THEN UPDATE public.orders SET status='cancelled',cancelled_at=now() WHERE id=_order_id;
 ELSIF _kind='grocery_cart' THEN UPDATE public.grocery_cart_orders SET status='cancelled',cancelled_at=now() WHERE id=_order_id;
 ELSE UPDATE public.grocery_list_orders SET status='cancelled',cancelled_at=now() WHERE id=_order_id; END IF;
 PERFORM set_config('app.bypass_order_guard',previous,true);
 INSERT INTO public.staff_audit_log(actor_id,action,entity_type,entity_id,details) VALUES(auth.uid(),'cancel',tbl,_order_id::text,jsonb_build_object('reason',trim(_note))); END $function$;