DO $patch$ DECLARE def text; BEGIN
 SELECT pg_get_functiondef(p.oid) INTO def FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='zz_post_order_financials';
 def:=replace(def,'WHERE order_kind = _kind AND order_id = NEW.id;','WHERE order_id = NEW.id AND (order_kind = _kind OR (_kind=''grocery_cart'' AND order_kind IN (''grocery'',''wholesale'')));');
 EXECUTE def;
END $patch$;