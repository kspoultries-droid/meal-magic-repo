CREATE OR REPLACE FUNCTION public.guard_staff_record_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$ DECLARE allowed text[]; BEGIN
 IF auth.uid() IS NULL OR public.has_role(auth.uid(),'admin') OR (TG_TABLE_NAME='riders' AND (coalesce(current_setting('app.bypass_rider_guard',true),'')='on' OR coalesce(current_setting('app.bypass_ledger_guard',true),'')='on')) THEN RETURN NEW; END IF;
 IF TG_TABLE_NAME='payouts' THEN IF public.has_permission(auth.uid(),'finance') AND NEW.processed_by=auth.uid() THEN
 IF (to_jsonb(NEW)-'receipt_path') IS DISTINCT FROM (to_jsonb(OLD)-'receipt_path') THEN RAISE EXCEPTION 'Only receipt attachment may change'; END IF;
 IF NEW.receipt_path IS NOT NULL AND split_part(NEW.receipt_path,'/',1)<>NEW.vendor_id::text THEN RAISE EXCEPTION 'Invalid receipt path'; END IF; END IF; RETURN NEW; END IF;
 IF TG_TABLE_NAME IN ('restaurants','grocery_stores') AND public.has_permission(auth.uid(),'partners') AND (to_jsonb(OLD)->>'owner_id')::uuid <> auth.uid() THEN
 IF NOT public.staff_city_allowed(OLD.city_id) OR NOT public.staff_city_allowed(NEW.city_id) THEN RAISE EXCEPTION 'City outside assigned scope'; END IF;
 IF (to_jsonb(NEW)->>'owner_id') IS DISTINCT FROM (to_jsonb(OLD)->>'owner_id') OR NEW.city_id IS DISTINCT FROM OLD.city_id OR NEW.id IS DISTINCT FROM OLD.id OR NEW.rating IS DISTINCT FROM OLD.rating THEN RAISE EXCEPTION 'Business identity and rating are protected'; END IF; END IF;
 IF TG_TABLE_NAME='riders' AND public.has_permission(auth.uid(),'riders') AND OLD.id<>auth.uid() THEN
 IF NOT public.staff_city_allowed(OLD.city_id) OR NOT public.staff_city_allowed(NEW.city_id) THEN RAISE EXCEPTION 'City outside assigned scope'; END IF;
 allowed:=ARRAY['is_available','is_suspended','suspension_reason','city_id','updated_at'];
 IF (to_jsonb(NEW)-allowed) IS DISTINCT FROM (to_jsonb(OLD)-allowed) THEN RAISE EXCEPTION 'Rider financial and identity fields are protected'; END IF; END IF; RETURN NEW; END $function$;