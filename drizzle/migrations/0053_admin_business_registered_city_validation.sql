CREATE OR REPLACE FUNCTION public.admin_create_own_business(_kind text,_name text,_city_id uuid,_address text,_phone text,_category_id uuid DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); bid uuid;
BEGIN
 IF uid IS NULL OR NOT has_role(uid,'admin') THEN RAISE EXCEPTION 'Admin access required'; END IF;
 IF _kind IS NULL OR _kind NOT IN ('restaurant','grocery','wholesale','service_provider') THEN RAISE EXCEPTION 'Invalid business type'; END IF;
 IF _name IS NULL OR length(trim(_name))<2 OR length(_name)>150 OR _address IS NULL OR length(trim(_address))<8 OR length(_address)>500 OR _phone IS NULL OR _phone !~ '^\+?[0-9]{10,15}$' THEN RAISE EXCEPTION 'Valid name, address and phone required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM cities WHERE id=_city_id) THEN RAISE EXCEPTION 'Choose a registered city'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(uid::text||':own-business'));
 IF _kind='restaurant' THEN
  INSERT INTO user_roles(user_id,role) VALUES(uid,'restaurant_owner') ON CONFLICT DO NOTHING;
  INSERT INTO restaurants(owner_id,name,city_id,pickup_address,is_active) VALUES(uid,trim(_name),_city_id,trim(_address),false) RETURNING id INTO bid;
 ELSIF _kind IN ('grocery','wholesale') THEN
  INSERT INTO grocery_stores(owner_id,name,city_id,store_type,is_active) VALUES(uid,trim(_name),_city_id,CASE WHEN _kind='wholesale' THEN 'wholesale' ELSE 'retail' END,false) RETURNING id INTO bid;
 ELSE
  IF NOT EXISTS(SELECT 1 FROM service_categories WHERE id=_category_id AND is_active) THEN RAISE EXCEPTION 'Choose an active service category'; END IF;
  IF EXISTS(SELECT 1 FROM service_providers WHERE user_id=uid) THEN RAISE EXCEPTION 'Your service provider profile already exists; open My services'; END IF;
  INSERT INTO user_roles(user_id,role) VALUES(uid,'mechanic') ON CONFLICT DO NOTHING;
  INSERT INTO service_providers(user_id,name,city_id,category_id,address,phone,is_active,is_available) VALUES(uid,trim(_name),_city_id,_category_id,trim(_address),_phone,true,false) RETURNING id INTO bid;
 END IF;
 RETURN bid;
END $$;
REVOKE ALL ON FUNCTION public.admin_create_own_business(text,text,uuid,text,text,uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.admin_create_own_business(text,text,uuid,text,text,uuid) TO authenticated;