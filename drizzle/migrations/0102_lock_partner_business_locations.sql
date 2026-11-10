CREATE OR REPLACE FUNCTION public.guard_business_location() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE old_loc jsonb; new_loc jsonb; a public.partner_applications%ROWTYPE; uid uuid:=auth.uid();
BEGIN
 IF TG_OP='INSERT' AND TG_TABLE_NAME IN ('restaurants','grocery_stores') AND NEW.pickup_lat IS NULL AND NEW.pickup_lng IS NULL THEN
  SELECT * INTO a FROM public.partner_applications WHERE user_id=NEW.owner_id AND business_name=NEW.name AND status IN ('pending','approved') AND applicant_type::text=CASE WHEN TG_TABLE_NAME='restaurants' THEN 'restaurant' WHEN to_jsonb(NEW)->>'store_type'='wholesale' THEN 'wholesale' ELSE 'grocery' END ORDER BY created_at DESC LIMIT 1;
  IF a.id IS NOT NULL THEN NEW.pickup_lat:=a.location_lat; NEW.pickup_lng:=a.location_lng; IF TG_TABLE_NAME='restaurants' THEN NEW.pickup_address:=a.address; END IF; END IF;
 END IF;
 IF TG_TABLE_NAME='service_providers' THEN new_loc:=jsonb_build_array(NEW.latitude,NEW.longitude,NEW.address,NEW.city_id);
 ELSE new_loc:=jsonb_build_array(NEW.pickup_lat,NEW.pickup_lng,to_jsonb(NEW)->>'pickup_address',NEW.city_id); END IF;
 IF TG_OP='UPDATE' THEN
  IF TG_TABLE_NAME='service_providers' THEN old_loc:=jsonb_build_array(OLD.latitude,OLD.longitude,OLD.address,OLD.city_id);
  ELSE old_loc:=jsonb_build_array(OLD.pickup_lat,OLD.pickup_lng,to_jsonb(OLD)->>'pickup_address',OLD.city_id); END IF;
  IF old_loc IS DISTINCT FROM new_loc AND (uid IS NULL OR NOT public.has_role(uid,'admin')) THEN RAISE EXCEPTION 'Only an admin can change a registered business location'; END IF;
 END IF;
 IF TG_TABLE_NAME='service_providers' THEN
  IF (NEW.latitude IS NULL)<>(NEW.longitude IS NULL) OR NEW.latitude NOT BETWEEN -90 AND 90 OR NEW.longitude NOT BETWEEN -180 AND 180 THEN RAISE EXCEPTION 'Invalid business coordinates'; END IF;
 ELSE
  IF (NEW.pickup_lat IS NULL)<>(NEW.pickup_lng IS NULL) OR NEW.pickup_lat NOT BETWEEN -90 AND 90 OR NEW.pickup_lng NOT BETWEEN -180 AND 180 THEN RAISE EXCEPTION 'Invalid business coordinates'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER b_guard_business_location BEFORE INSERT OR UPDATE ON public.restaurants FOR EACH ROW EXECUTE FUNCTION public.guard_business_location();
CREATE TRIGGER b_guard_business_location BEFORE INSERT OR UPDATE ON public.grocery_stores FOR EACH ROW EXECUTE FUNCTION public.guard_business_location();
CREATE TRIGGER b_guard_business_location BEFORE INSERT OR UPDATE ON public.service_providers FOR EACH ROW EXECUTE FUNCTION public.guard_business_location();
CREATE OR REPLACE FUNCTION public.admin_relocate_business(_kind text,_id uuid,_city_id uuid,_lat double precision,_lng double precision,_address text,_reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE before_row jsonb; after_row jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin access required'; END IF;
 IF _kind NOT IN ('restaurant','grocery','service_provider') OR _kind IS NULL THEN RAISE EXCEPTION 'Invalid business type'; END IF;
 IF _lat IS NULL OR _lng IS NULL OR _lat NOT BETWEEN -90 AND 90 OR _lng NOT BETWEEN -180 AND 180 OR _lat::text IN ('NaN','Infinity','-Infinity') OR _lng::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Valid map pin required'; END IF;
 IF _city_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.cities WHERE id=_city_id) THEN RAISE EXCEPTION 'Registered city required'; END IF;
 IF _reason IS NULL OR length(trim(_reason))<3 OR length(_reason)>500 THEN RAISE EXCEPTION 'Relocation reason required'; END IF;
 IF _kind IN ('restaurant','service_provider') AND (_address IS NULL OR length(trim(_address))<8) THEN RAISE EXCEPTION 'Full business address required'; END IF;
 IF _kind='restaurant' THEN SELECT to_jsonb(r) INTO before_row FROM public.restaurants r WHERE id=_id FOR UPDATE; UPDATE public.restaurants SET city_id=_city_id,pickup_lat=_lat,pickup_lng=_lng,pickup_address=trim(_address) WHERE id=_id RETURNING to_jsonb(restaurants.*) INTO after_row;
 ELSIF _kind='grocery' THEN SELECT to_jsonb(r) INTO before_row FROM public.grocery_stores r WHERE id=_id FOR UPDATE; UPDATE public.grocery_stores SET city_id=_city_id,pickup_lat=_lat,pickup_lng=_lng WHERE id=_id RETURNING to_jsonb(grocery_stores.*) INTO after_row;
 ELSE SELECT to_jsonb(r) INTO before_row FROM public.service_providers r WHERE id=_id FOR UPDATE; UPDATE public.service_providers SET city_id=_city_id,latitude=_lat,longitude=_lng,address=trim(_address) WHERE id=_id RETURNING to_jsonb(service_providers.*) INTO after_row; END IF;
 IF before_row IS NULL THEN RAISE EXCEPTION 'Business not found'; END IF;
 INSERT INTO public.staff_audit_log(actor_id,action,entity_type,entity_id,city_id,details) VALUES(auth.uid(),'business_relocated',_kind,_id::text,_city_id,jsonb_build_object('reason',trim(_reason),'before',before_row,'after',after_row));
END $$;
REVOKE ALL ON FUNCTION public.admin_relocate_business(text,uuid,uuid,double precision,double precision,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_relocate_business(text,uuid,uuid,double precision,double precision,text,text) TO authenticated,service_role;