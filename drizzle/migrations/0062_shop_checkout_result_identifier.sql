DO $patch$ DECLARE def text; BEGIN
 SELECT pg_get_functiondef(p.oid) INTO def FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='create_shop_order';
 def:=replace(def,'id uuid; discount','_new_order_id uuid; discount');
 def:=replace(def,'INTO id;','INTO _new_order_id;');
 def:=replace(def,'RETURN id;','RETURN _new_order_id;');
 EXECUTE def;
END $patch$;