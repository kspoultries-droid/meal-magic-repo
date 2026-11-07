DO $migration$
DECLARE fn regprocedure := 'public.list_order_action(uuid,text,integer,numeric,numeric,text,text,text,text,double precision,double precision)'::regprocedure; definition text; old_guard text := $old$IF o.status NOT IN ('pending','quoted') THEN RAISE EXCEPTION 'منظور شدہ رسید تبدیل نہیں ہو سکتی؛ نئی منظوری ضروری ہے'; END IF;$old$; new_guard text := $new$IF o.status NOT IN ('pending','quoted') AND NOT (o.status IN ('confirmed','ready_for_pickup','delivering') AND nullif(trim(o.bill_image_url),'') IS NULL) THEN RAISE EXCEPTION 'منظور شدہ رسید تبدیل نہیں ہو سکتی؛ نئی منظوری ضروری ہے'; END IF;$new$;
BEGIN
 definition := pg_get_functiondef(fn);
 IF strpos(definition,old_guard)=0 THEN RAISE EXCEPTION 'Expected bill guard not found'; END IF;
 EXECUTE replace(definition,old_guard,new_guard);
END $migration$;