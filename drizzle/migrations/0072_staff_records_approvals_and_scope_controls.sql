CREATE OR REPLACE FUNCTION public.guard_staff_record_fields() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE allowed text[]; BEGIN
 IF auth.uid() IS NULL OR public.has_role(auth.uid(),'admin') THEN RETURN NEW; END IF;
 IF TG_TABLE_NAME='payouts' THEN IF public.has_permission(auth.uid(),'finance') AND NEW.processed_by=auth.uid() THEN
 IF (to_jsonb(NEW)-'receipt_path') IS DISTINCT FROM (to_jsonb(OLD)-'receipt_path') THEN RAISE EXCEPTION 'Only receipt attachment may change'; END IF;
 IF NEW.receipt_path IS NOT NULL AND split_part(NEW.receipt_path,'/',1)<>NEW.vendor_id::text THEN RAISE EXCEPTION 'Invalid receipt path'; END IF; END IF; RETURN NEW; END IF;
 IF TG_TABLE_NAME IN ('restaurants','grocery_stores') AND public.has_permission(auth.uid(),'partners') AND OLD.owner_id<>auth.uid() THEN
 IF NOT public.staff_city_allowed(OLD.city_id) OR NOT public.staff_city_allowed(NEW.city_id) THEN RAISE EXCEPTION 'City outside assigned scope'; END IF;
 IF NEW.owner_id IS DISTINCT FROM OLD.owner_id OR NEW.city_id IS DISTINCT FROM OLD.city_id OR NEW.id IS DISTINCT FROM OLD.id OR NEW.rating IS DISTINCT FROM OLD.rating THEN RAISE EXCEPTION 'Business identity and rating are protected'; END IF; END IF;
 IF TG_TABLE_NAME='riders' AND public.has_permission(auth.uid(),'riders') AND OLD.id<>auth.uid() THEN
 IF NOT public.staff_city_allowed(OLD.city_id) OR NOT public.staff_city_allowed(NEW.city_id) THEN RAISE EXCEPTION 'City outside assigned scope'; END IF;
 allowed:=ARRAY['is_available','is_suspended','suspension_reason','city_id','updated_at'];
 IF (to_jsonb(NEW)-allowed) IS DISTINCT FROM (to_jsonb(OLD)-allowed) THEN RAISE EXCEPTION 'Rider financial and identity fields are protected'; END IF; END IF; RETURN NEW; END $$;
CREATE TRIGGER a_staff_business_fields BEFORE UPDATE ON public.restaurants FOR EACH ROW EXECUTE FUNCTION public.guard_staff_record_fields();
CREATE TRIGGER a_staff_store_fields BEFORE UPDATE ON public.grocery_stores FOR EACH ROW EXECUTE FUNCTION public.guard_staff_record_fields();
CREATE TRIGGER a_staff_rider_fields BEFORE UPDATE ON public.riders FOR EACH ROW EXECUTE FUNCTION public.guard_staff_record_fields();
CREATE TRIGGER a_staff_payout_fields BEFORE UPDATE ON public.payouts FOR EACH ROW EXECUTE FUNCTION public.guard_staff_record_fields();
REVOKE ALL ON FUNCTION public.guard_staff_record_fields() FROM PUBLIC,anon,authenticated;
CREATE POLICY "Finance attaches own payout receipt" ON public.payouts FOR UPDATE TO authenticated USING(public.has_permission(auth.uid(),'finance') AND processed_by=auth.uid() AND public.staff_vendor_allowed(vendor_id)) WITH CHECK(public.has_permission(auth.uid(),'finance') AND processed_by=auth.uid() AND public.staff_vendor_allowed(vendor_id));
CREATE OR REPLACE FUNCTION public.request_approval(_kind text,_amount numeric,_reference_id text,_note text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE id uuid; BEGIN
 IF NOT ((_kind='refund' AND public.has_permission(auth.uid(),'support')) OR (_kind IN ('payout','other') AND public.has_permission(auth.uid(),'finance'))) THEN RAISE EXCEPTION 'Approval request outside assigned work'; END IF;
 IF _amount IS NULL OR _amount<=0 OR length(trim(coalesce(_note,'')))<3 THEN RAISE EXCEPTION 'Amount and reason required'; END IF;
 IF _kind='payout' AND NOT public.staff_vendor_allowed(_reference_id::uuid) THEN RAISE EXCEPTION 'Vendor outside assigned scope'; END IF;
 IF _kind='refund' AND NOT (public.staff_order_allowed('support','food',_reference_id::uuid) OR public.staff_order_allowed('support','grocery_cart',_reference_id::uuid) OR public.staff_order_allowed('support','grocery_list',_reference_id::uuid) OR public.staff_order_allowed('support','service',_reference_id::uuid)) THEN RAISE EXCEPTION 'Order outside assigned scope'; END IF;
 IF _kind='other' AND EXISTS(SELECT 1 FROM public.staff_scopes WHERE user_id=auth.uid()) THEN RAISE EXCEPTION 'Global request requires unscoped finance'; END IF;
 INSERT INTO public.approval_requests(kind,amount,reference_id,note,requested_by) VALUES(_kind,_amount,left(_reference_id,100),left(_note,500),auth.uid()) RETURNING approval_requests.id INTO id;
 INSERT INTO public.staff_audit_log(actor_id,action,entity_type,entity_id,details) VALUES(auth.uid(),'request','approval_requests',id::text,jsonb_build_object('kind',_kind,'amount',_amount)); RETURN id; END $$;
CREATE OR REPLACE FUNCTION public.staff_set_cities(_user_id uuid,_city_ids uuid[]) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NOT public.has_permission(auth.uid(),'team') THEN RAISE EXCEPTION 'Team permission required'; END IF;
 IF EXISTS(SELECT 1 FROM public.app_owner WHERE user_id=_user_id) THEN RAISE EXCEPTION 'Owner scope is protected'; END IF;
 IF NOT public.is_staff(_user_id) THEN RAISE EXCEPTION 'Not a team member'; END IF;
 DELETE FROM public.staff_scopes WHERE user_id=_user_id;
 INSERT INTO public.staff_scopes(user_id,city_id) SELECT _user_id,c FROM unnest(coalesce(_city_ids,'{}'::uuid[])) c ON CONFLICT DO NOTHING;
 INSERT INTO public.staff_audit_log(actor_id,action,entity_type,entity_id,details) VALUES(auth.uid(),'scope','staff_scopes',_user_id::text,jsonb_build_object('city_ids',_city_ids)); END $$;
REVOKE ALL ON FUNCTION public.staff_set_cities(uuid,uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.staff_set_cities(uuid,uuid[]) TO authenticated,service_role;
DO $$ DECLARE d text; BEGIN SELECT pg_get_functiondef('public.staff_add(text,public.app_role,uuid[])'::regprocedure) INTO d;
 d:=replace(d,'  RETURN _uid;','  IF NOT EXISTS(SELECT 1 FROM public.app_owner WHERE user_id=_uid) THEN PERFORM public.staff_set_cities(_uid,_city_ids); END IF;'||chr(10)||'  RETURN _uid;'); EXECUTE d; END $$;
CREATE OR REPLACE FUNCTION public.staff_approval_allowed(_kind text,_ref text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT public.has_permission(auth.uid(),'approve') AND CASE _kind WHEN 'payout' THEN public.staff_vendor_allowed(_ref::uuid) WHEN 'refund' THEN public.staff_order_allowed('finance','food',_ref::uuid) OR public.staff_order_allowed('finance','grocery_cart',_ref::uuid) OR public.staff_order_allowed('finance','grocery_list',_ref::uuid) OR public.staff_order_allowed('finance','service',_ref::uuid) ELSE NOT EXISTS(SELECT 1 FROM public.staff_scopes WHERE user_id=auth.uid()) OR public.has_role(auth.uid(),'admin') END $$;
REVOKE ALL ON FUNCTION public.staff_approval_allowed(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.staff_approval_allowed(text,text) TO authenticated,service_role;
ALTER POLICY "approvals read" ON public.approval_requests USING(requested_by=auth.uid() OR public.staff_approval_allowed(kind,reference_id));
DO $$ DECLARE d text; BEGIN SELECT pg_get_functiondef('public.decide_approval(uuid,boolean,text)'::regprocedure) INTO d;
 d:=replace(d,'IF NOT FOUND OR _r.status <> ''pending'' THEN','IF NOT public.staff_approval_allowed(_r.kind,_r.reference_id) THEN RAISE EXCEPTION ''Approval outside assigned scope''; END IF;'||chr(10)||'  IF NOT FOUND OR _r.status <> ''pending'' THEN'); EXECUTE d; END $$;