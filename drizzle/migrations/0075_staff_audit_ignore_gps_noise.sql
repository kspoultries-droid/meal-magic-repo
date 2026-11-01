CREATE OR REPLACE FUNCTION public.staff_audit_business_details(_entity text, _action text, _details jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=public AS $$
 SELECT CASE WHEN _action='update' AND _entity='riders' THEN coalesce(_details,'{}'::jsonb)-ARRAY['updated_at','last_seen_at','current_lat','current_lng','location_updated_at','location_accuracy_m'] ELSE coalesce(_details,'{}'::jsonb) END
$$;
GRANT EXECUTE ON FUNCTION public.staff_audit_business_details(text,text,jsonb) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.audit_staff_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid uuid:=auth.uid(); _old jsonb; _new jsonb; _diff jsonb:='{}'::jsonb; k text;
BEGIN
 IF _uid IS NULL OR NOT public.is_staff(_uid) THEN RETURN COALESCE(NEW,OLD); END IF;
 _old:=CASE WHEN TG_OP<>'INSERT' THEN to_jsonb(OLD) ELSE '{}'::jsonb END;
 _new:=CASE WHEN TG_OP<>'DELETE' THEN to_jsonb(NEW) ELSE '{}'::jsonb END;
 IF TG_OP='UPDATE' THEN
  FOR k IN SELECT jsonb_object_keys(_new) LOOP
   IF k NOT IN ('updated_at','last_seen_at','current_lat','current_lng') AND (_old->k) IS DISTINCT FROM (_new->k) THEN
    _diff:=_diff||jsonb_build_object(k,jsonb_build_object('from',_old->k,'to',_new->k));
   END IF;
  END LOOP;
  _diff:=public.staff_audit_business_details(TG_TABLE_NAME,'update',_diff);
  IF _diff='{}'::jsonb THEN RETURN NEW; END IF;
 ELSE _diff:=CASE WHEN TG_OP='INSERT' THEN _new ELSE _old END;
 END IF;
 INSERT INTO public.staff_audit_log(actor_id,action,entity_type,entity_id,details)
 VALUES(_uid,lower(TG_OP),TG_TABLE_NAME,COALESCE(_new->>'id',_old->>'id',_new->>'user_id',_old->>'user_id'),_diff);
 RETURN COALESCE(NEW,OLD);
END $$;
CREATE VIEW public.staff_business_activity WITH (security_invoker=true) AS
 SELECT id,actor_id,action,entity_type,entity_id,public.staff_audit_business_details(entity_type,action,details) AS details,created_at
 FROM public.staff_audit_log
 WHERE action<>'update' OR public.staff_audit_business_details(entity_type,action,details)<>'{}'::jsonb;
GRANT SELECT ON public.staff_business_activity TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.team_performance(_days integer DEFAULT 7)
RETURNS TABLE(actor_id uuid,email text,full_name text,total_actions bigint,order_actions bigint,rider_actions bigint,finance_actions bigint,approvals bigint,last_action_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.has_permission(auth.uid(),'team') THEN RAISE EXCEPTION 'not allowed'; END IF;
 RETURN QUERY SELECT a.actor_id,u.email::text,p.full_name,count(*),
 count(*) FILTER(WHERE a.entity_type IN ('orders','grocery_cart_orders','grocery_list_orders','service_bookings')),
 count(*) FILTER(WHERE a.entity_type IN ('riders','delivery_offers')),
 count(*) FILTER(WHERE a.entity_type IN ('payouts','refunds','rider_remittances')),
 count(*) FILTER(WHERE a.entity_type='approval_requests' AND a.action IN ('approve','reject')),max(a.created_at)
 FROM public.staff_business_activity a LEFT JOIN auth.users u ON u.id=a.actor_id LEFT JOIN public.profiles p ON p.id=a.actor_id
 WHERE a.created_at>=(((now() AT TIME ZONE 'Asia/Karachi')::date-(greatest(1,least(coalesce(_days,7),365))-1))::timestamp AT TIME ZONE 'Asia/Karachi')
 GROUP BY a.actor_id,u.email,p.full_name ORDER BY count(*) DESC;
END $$;
COMMENT ON VIEW public.staff_business_activity IS 'Business-only staff activity; preserves original audit rows and underlying RLS, excludes GPS-only updates.';