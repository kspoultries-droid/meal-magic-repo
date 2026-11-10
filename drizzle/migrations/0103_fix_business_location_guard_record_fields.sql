CREATE OR REPLACE FUNCTION public.guard_business_location() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE old_loc jsonb; new_loc jsonb; a public.partner_applications%ROWTYPE; uid uuid:=auth.uid(); n jsonb:=to_jsonb(NEW); o jsonb;
BEGIN
 IF TG_OP='INSERT' AND TG_TABLE_NAME IN ('restaurants','grocery_stores') THEN
  IF n->>'pickup_lat' IS NULL AND n->>'pickup_lng' IS NULL THEN
   SELECT * INTO a FROM public.partner_applications WHERE user_id=(n->>'owner_id')::uuid AND business_name=n->>'name' AND status IN ('pending','approved') AND applicant_type::text=CASE WHEN TG_TABLE_NAME='restaurants' THEN 'restaurant' WHEN n->>'store_type'='wholesale' THEN 'wholesale' ELSE 'grocery' END ORDER BY created_at DESC LIMIT 1;
   IF a.id IS NOT NULL THEN
    n:=n||jsonb_build_object('pickup_lat',a.location_lat,'pickup_lng',a.location_lng);
    IF TG_TABLE_NAME='restaurants' THEN n:=n||jsonb_build_object('pickup_address',a.address); END IF;
    NEW:=jsonb_populate_record(NEW,n);
   END IF;
  END IF;
 END IF;
 IF TG_TABLE_NAME='service_providers' THEN new_loc:=jsonb_build_array(n->'latitude',n->'longitude',n->'address',n->'city_id');
 ELSE new_loc:=jsonb_build_array(n->'pickup_lat',n->'pickup_lng',n->'pickup_address',n->'city_id'); END IF;
 IF TG_OP='UPDATE' THEN
  o:=to_jsonb(OLD);
  IF TG_TABLE_NAME='service_providers' THEN old_loc:=jsonb_build_array(o->'latitude',o->'longitude',o->'address',o->'city_id');
  ELSE old_loc:=jsonb_build_array(o->'pickup_lat',o->'pickup_lng',o->'pickup_address',o->'city_id'); END IF;
  IF old_loc IS DISTINCT FROM new_loc AND (uid IS NULL OR NOT public.has_role(uid,'admin')) THEN RAISE EXCEPTION 'Only an admin can change a registered business location'; END IF;
 END IF;
 IF TG_TABLE_NAME='service_providers' THEN
  IF (NEW.latitude IS NULL)<>(NEW.longitude IS NULL) OR NEW.latitude NOT BETWEEN -90 AND 90 OR NEW.longitude NOT BETWEEN -180 AND 180 OR NEW.latitude::text IN ('NaN','Infinity','-Infinity') OR NEW.longitude::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Invalid business coordinates'; END IF;
 ELSE
  IF (NEW.pickup_lat IS NULL)<>(NEW.pickup_lng IS NULL) OR NEW.pickup_lat NOT BETWEEN -90 AND 90 OR NEW.pickup_lng NOT BETWEEN -180 AND 180 OR NEW.pickup_lat::text IN ('NaN','Infinity','-Infinity') OR NEW.pickup_lng::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Invalid business coordinates'; END IF;
 END IF;
 RETURN NEW;
END $$;