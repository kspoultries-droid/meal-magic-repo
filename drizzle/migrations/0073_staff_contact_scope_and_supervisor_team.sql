DO $$ DECLARE f record; d text; BEGIN
FOR f IN SELECT p.oid,p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('get_delivery_rider_location','get_delivery_route_context','get_order_customer_contact','get_order_rider_info','can_access_order_chat','get_service_provider_contact','rider_operations_report') LOOP
 d:=pg_get_functiondef(f.oid);
 IF f.proname IN ('get_delivery_rider_location','get_delivery_route_context') THEN
 d:=replace(d,'public.has_permission(auth.uid(),''dispatch'')','public.staff_order_allowed(''dispatch'',_kind,_order_id)');
 d:=replace(d,'public.has_role(auth.uid(),''support'')','public.staff_order_allowed(''support'',_kind,_order_id)');
 ELSIF f.proname='get_order_customer_contact' THEN d:=replace(d,'public.has_role(auth.uid(), ''support'')','public.staff_order_allowed(''support'',_kind,_order_id) OR public.staff_order_allowed(''dispatch'',_kind,_order_id)');
 ELSIF f.proname='get_order_rider_info' THEN d:=replace(d,'public.has_role(auth.uid(), ''support'')','public.staff_order_allowed(''support'',''food'',_order_id) OR public.staff_order_allowed(''dispatch'',''food'',_order_id)');
 ELSIF f.proname='can_access_order_chat' THEN d:=replace(d,'public.has_role(_user_id,''support'')','(_user_id=auth.uid() AND public.staff_order_allowed(''support'',CASE WHEN _kind=''grocery'' THEN ''grocery_cart'' ELSE _kind END,_order_id))');
 ELSIF f.proname='get_service_provider_contact' THEN d:=replace(d,'has_role(auth.uid(), ''support''::app_role)','(public.has_permission(auth.uid(),''support'') AND public.staff_city_allowed(sp.city_id))');
 ELSIF f.proname='rider_operations_report' THEN
 d:=replace(d,'has_role(auth.uid(),''support'')','has_permission(auth.uid(),''dispatch'')');
 d:=replace(d,'FROM orders WHERE created_at','FROM orders WHERE public.staff_city_allowed(city_id) AND created_at');
 d:=replace(d,'FROM grocery_cart_orders WHERE created_at','FROM grocery_cart_orders WHERE public.staff_city_allowed(city_id) AND created_at');
 d:=replace(d,'FROM grocery_list_orders WHERE created_at','FROM grocery_list_orders WHERE public.staff_order_allowed(''orders'',''grocery_list'',id) AND created_at');
 d:=replace(d,'FROM delivery_offers WHERE created_at','FROM delivery_offers WHERE public.staff_city_allowed(public.staff_order_city(order_kind,order_id)) AND created_at');
 d:=replace(d,'FROM rider_earnings WHERE status=''needs_review''','FROM rider_earnings WHERE public.staff_rider_allowed(''finance'',rider_id) AND status=''needs_review''');
 END IF;
 EXECUTE d;
END LOOP;
END $$;
ALTER POLICY "Staff can view all order events" ON public.order_events USING(public.has_role(auth.uid(),'admin') OR public.staff_order_allowed('orders',order_type,order_id));
CREATE POLICY "Staff read scoped order item details" ON public.order_items FOR SELECT TO authenticated USING(public.staff_order_allowed('orders','food',order_id));
DO $$ DECLARE d text; BEGIN
 SELECT pg_get_functiondef('public.is_staff(uuid)'::regprocedure) INTO d; d:=replace(d,'''rider_supervisor''','''rider_supervisor'',''service_manager'''); EXECUTE d;
 SELECT pg_get_functiondef('public.list_staff()'::regprocedure) INTO d; d:=replace(d,'''rider_supervisor''','''rider_supervisor'',''service_manager'''); EXECUTE d;
 SELECT pg_get_functiondef('public.staff_add(text,public.app_role,uuid[])'::regprocedure) INTO d; d:=replace(d,'''rider_supervisor''','''rider_supervisor'',''service_manager'''); EXECUTE d;
END $$;
CREATE OR REPLACE FUNCTION public.guard_admin_role_assignment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF auth.uid() IS NULL THEN RETURN coalesce(NEW,OLD); END IF;
 IF ((TG_OP='INSERT' AND NEW.role='admin') OR (TG_OP='DELETE' AND OLD.role='admin') OR (TG_OP='UPDATE' AND (OLD.role='admin' OR NEW.role='admin'))) AND NOT EXISTS(SELECT 1 FROM public.app_owner WHERE user_id=auth.uid()) THEN RAISE EXCEPTION 'Only the app owner can assign or remove admins'; END IF;
 RETURN coalesce(NEW,OLD); END $$;
CREATE TRIGGER a_guard_admin_role_assignment BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.guard_admin_role_assignment();
REVOKE ALL ON FUNCTION public.guard_admin_role_assignment() FROM PUBLIC,anon,authenticated;