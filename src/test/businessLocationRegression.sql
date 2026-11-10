-- Isolated tables exercise the deployed guard; no production business is moved.
BEGIN;
CREATE TEMP TABLE restaurants (id uuid, owner_id uuid, name text, pickup_lat double precision, pickup_lng double precision, pickup_address text, city_id uuid);
CREATE TEMP TABLE grocery_stores (id uuid, owner_id uuid, name text, pickup_lat double precision, pickup_lng double precision, city_id uuid, store_type text);
CREATE TEMP TABLE service_providers (id uuid, latitude double precision, longitude double precision, address text, city_id uuid);
CREATE TRIGGER location_guard BEFORE INSERT OR UPDATE ON pg_temp.restaurants FOR EACH ROW EXECUTE FUNCTION public.guard_business_location();
CREATE TRIGGER location_guard BEFORE INSERT OR UPDATE ON pg_temp.grocery_stores FOR EACH ROW EXECUTE FUNCTION public.guard_business_location();
CREATE TRIGGER location_guard BEFORE INSERT OR UPDATE ON pg_temp.service_providers FOR EACH ROW EXECUTE FUNCTION public.guard_business_location();
INSERT INTO pg_temp.restaurants VALUES ('11111111-1111-4111-8111-111111111111',NULL,'Test',28,70,'Original shop address',NULL);
INSERT INTO pg_temp.grocery_stores VALUES ('11111111-1111-4111-8111-111111111111',NULL,'Test',28,70,NULL,'retail');
INSERT INTO pg_temp.service_providers VALUES ('11111111-1111-4111-8111-111111111111',28,70,'Original shop address',NULL);
DO $$
DECLARE target text; blocked boolean; owner uuid;
BEGIN
 SELECT user_id INTO owner FROM public.app_owner LIMIT 1;
 IF owner IS NULL THEN RAISE EXCEPTION 'Owner fixture required'; END IF;
 PERFORM set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
 FOREACH target IN ARRAY ARRAY['restaurants','grocery_stores','service_providers'] LOOP
  blocked:=false;
  BEGIN
   IF target='service_providers' THEN UPDATE pg_temp.service_providers SET latitude=29;
   ELSE EXECUTE format('UPDATE pg_temp.%I SET pickup_lat=29',target); END IF;
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
   IF SQLERRM<>'Only an admin can change a registered business location' THEN RAISE; END IF;
   blocked:=true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'Partner changed location on %',target; END IF;
 END LOOP;
 blocked:=false;
 BEGIN UPDATE pg_temp.restaurants SET pickup_address='Moved address'; EXCEPTION WHEN SQLSTATE 'P0001' THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Partner changed pickup address'; END IF;
 blocked:=false;
 BEGIN UPDATE pg_temp.grocery_stores SET city_id='22222222-2222-4222-8222-222222222222'; EXCEPTION WHEN SQLSTATE 'P0001' THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Partner changed city'; END IF;
 UPDATE pg_temp.grocery_stores SET name='Normal editing works';
 IF (SELECT name FROM pg_temp.grocery_stores)<>'Normal editing works' THEN RAISE EXCEPTION 'Normal edit broken'; END IF;
 PERFORM set_config('request.jwt.claim.sub',owner::text,true);
 UPDATE pg_temp.restaurants SET pickup_lat=29;
 UPDATE pg_temp.grocery_stores SET pickup_lat=29;
 UPDATE pg_temp.service_providers SET latitude=29;
 IF (SELECT pickup_lat FROM pg_temp.restaurants)<>29 OR (SELECT pickup_lat FROM pg_temp.grocery_stores)<>29 OR (SELECT latitude FROM pg_temp.service_providers)<>29 THEN RAISE EXCEPTION 'Admin relocation broken'; END IF;
 RAISE NOTICE 'PASS: partners cannot move pins, addresses or cities; ordinary edits and admin relocation work';
END $$;
ROLLBACK;