ALTER TABLE public.grocery_list_orders ADD COLUMN image_urls text[] NOT NULL DEFAULT '{}', ADD COLUMN customer_revision text, ADD COLUMN quote_version integer NOT NULL DEFAULT 0, ADD COLUMN accepted_quote_version integer, ADD COLUMN items_subtotal numeric, ADD COLUMN delivery_weight_kg numeric, ADD COLUMN delivery_quote_snapshot jsonb;
CREATE TABLE public.shop_customer_blocks (store_id uuid NOT NULL REFERENCES public.grocery_stores(id) ON DELETE CASCADE, customer_id uuid NOT NULL, reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(store_id,customer_id));
GRANT SELECT,INSERT,DELETE ON public.shop_customer_blocks TO authenticated;
GRANT ALL ON public.shop_customer_blocks TO service_role;
ALTER TABLE public.shop_customer_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY shop_owner_blocks ON public.shop_customer_blocks FOR ALL TO authenticated USING (EXISTS(SELECT 1 FROM public.grocery_stores s WHERE s.id=store_id AND s.owner_id=auth.uid())) WITH CHECK(EXISTS(SELECT 1 FROM public.grocery_stores s WHERE s.id=store_id AND s.owner_id=auth.uid()));
CREATE INDEX list_customer_waiting_idx ON public.grocery_list_orders(customer_id,status);
CREATE OR REPLACE FUNCTION public.guard_list_submission() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RETURN NEW; END IF;
 IF NEW.customer_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'اپنے اکاؤنٹ سے لسٹ بھیجیں'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('list-customer:'||NEW.customer_id::text,0));
 IF EXISTS(SELECT 1 FROM public.shop_customer_blocks b WHERE b.store_id=NEW.store_id AND b.customer_id=NEW.customer_id) THEN RAISE EXCEPTION 'اس دکان نے آپ کی نئی لسٹیں بند کی ہیں'; END IF;
 IF EXISTS(SELECT 1 FROM public.grocery_list_orders o WHERE o.customer_id=NEW.customer_id AND o.status IN ('pending','quoted')) THEN RAISE EXCEPTION 'ایک وقت میں صرف 1 انتظار والی راشن لسٹ بھیج سکتے ہیں؛ پہلے والی کا فیصلہ کریں'; END IF;
 IF NEW.delivery_lat IS NULL OR NEW.delivery_lng IS NULL OR NEW.delivery_lat NOT BETWEEN -90 AND 90 OR NEW.delivery_lng NOT BETWEEN -180 AND 180 THEN RAISE EXCEPTION 'ڈیلیوری کا درست مقام منتخب کریں'; END IF;
 IF cardinality(NEW.image_urls)>4 THEN RAISE EXCEPTION 'زیادہ سے زیادہ 4 تصاویر'; END IF;
 NEW.status:='pending'; NEW.total_amount:=0; NEW.delivery_fee:=0; NEW.rider_id:=NULL; NEW.dispatch_state:='none'; NEW.quote_version:=0; NEW.accepted_quote_version:=NULL; NEW.items_subtotal:=NULL; NEW.delivery_quote_snapshot:=NULL;
 RETURN NEW;
END $$;
CREATE TRIGGER a_list_submission BEFORE INSERT ON public.grocery_list_orders FOR EACH ROW EXECUTE FUNCTION public.guard_list_submission();
CREATE OR REPLACE FUNCTION public.protect_grocery_list_pricing() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE owner_ok boolean;
BEGIN
 IF auth.uid() IS NULL OR coalesce(current_setting('app.list_action',true),'')='on' THEN RETURN NEW; END IF;
 SELECT EXISTS(SELECT 1 FROM public.grocery_stores s WHERE s.id=OLD.store_id AND s.owner_id=auth.uid()) INTO owner_ok;
 IF (to_jsonb(NEW)-ARRAY['updated_at','delivery_stage','cash_received','cash_received_at','returned_at','return_requested_at','picked_up_at','rider_arrived_at','arrived_customer_at','delivered_at','cancelled_at','delivery_failure_reason','status','rider_id','rider_assigned_at','dispatch_state','accepted_at','ready_at','accepted_quote_version']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['updated_at','delivery_stage','cash_received','cash_received_at','returned_at','return_requested_at','picked_up_at','rider_arrived_at','arrived_customer_at','delivered_at','cancelled_at','delivery_failure_reason','status','rider_id','rider_assigned_at','dispatch_state','accepted_at','ready_at','accepted_quote_version']) THEN
  RAISE EXCEPTION 'لسٹ کی تبدیلی مقررہ کارروائی سے کریں';
 END IF;
 IF NEW.status IS DISTINCT FROM OLD.status AND coalesce(current_setting('app.rider_lifecycle',true),'')<>'on' AND coalesce(current_setting('app.bypass_order_guard',true),'')<>'on' THEN
  IF OLD.customer_id=auth.uid() AND OLD.status='quoted' AND NEW.status='confirmed' AND OLD.total_amount>0 THEN NEW.accepted_quote_version:=OLD.quote_version;
  ELSIF NEW.status='cancelled' AND OLD.status IN ('pending','quoted','confirmed') AND (owner_ok OR OLD.customer_id=auth.uid() OR public.has_role(auth.uid(),'admin')) THEN NULL;
  ELSE RAISE EXCEPTION 'لسٹ کی منظوری یا تیاری مقررہ کارروائی سے کریں'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.list_order_action(_order_id uuid,_action text,_version integer DEFAULT NULL,_amount numeric DEFAULT NULL,_weight numeric DEFAULT NULL,_note text DEFAULT NULL,_alternatives text DEFAULT NULL,_bill text DEFAULT NULL,_address text DEFAULT NULL,_lat double precision DEFAULT NULL,_lng double precision DEFAULT NULL) RETURNS public.grocery_list_orders LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.grocery_list_orders%ROWTYPE; s public.grocery_stores%ROWTYPE; q jsonb; fee numeric;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'پہلے لاگ ان کریں'; END IF;
 SELECT * INTO o FROM public.grocery_list_orders WHERE id=_order_id FOR UPDATE;
 IF o.id IS NULL THEN RAISE EXCEPTION 'آرڈر نہیں ملا'; END IF;
 SELECT * INTO s FROM public.grocery_stores WHERE id=o.store_id;
 IF _action IN ('quote','bill','ready','block') THEN
  IF s.owner_id IS DISTINCT FROM auth.uid() AND NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'دکان کے مالک کی اجازت درکار ہے'; END IF;
 ELSIF o.customer_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'یہ آرڈر آپ کا نہیں'; END IF;
 PERFORM set_config('app.list_action','on',true); PERFORM set_config('app.bypass_order_guard','on',true);
 IF _action='quote' THEN
  IF o.status NOT IN ('pending','quoted') OR o.rider_id IS NOT NULL THEN RAISE EXCEPTION 'اس مرحلے میں نئی قیمت نہیں بھیج سکتے'; END IF;
  IF _amount IS NULL THEN
   IF nullif(coalesce(_bill,o.bill_image_url),'') IS NULL THEN RAISE EXCEPTION 'رسید کی تصویر درکار ہے'; END IF;
   UPDATE public.grocery_list_orders SET status='quoted',total_amount=0,items_subtotal=NULL,delivery_fee=0,delivery_quote_snapshot=NULL,accepted_quote_version=NULL,quote_version=quote_version+1,bill_image_url=coalesce(_bill,bill_image_url),shopkeeper_notes=_note,alternatives_note=_alternatives WHERE id=o.id;
  ELSE
   IF _amount<=0 OR _weight IS NULL OR _weight<=0 THEN RAISE EXCEPTION 'حتمی قیمت اور سامان کا وزن درکار ہے'; END IF;
   q:=public.shop_delivery_quote(s.id,s.city_id,o.delivery_lat,o.delivery_lng,_weight,_amount);
   IF coalesce((q->>'needs_quote')::boolean,false) OR q->>'mode' IS DISTINCT FROM 'rider' THEN RAISE EXCEPTION 'اس لسٹ کے لیے مقامی رائیڈر ڈیلیوری کی تصدیق درکار ہے'; END IF;
   fee:=coalesce((q->>'customer_fee')::numeric,0);
   UPDATE public.grocery_list_orders SET status='quoted',items_subtotal=_amount,total_amount=_amount+fee,delivery_fee=fee,delivery_weight_kg=_weight,delivery_quote_snapshot=q,accepted_quote_version=NULL,quote_version=quote_version+1,bill_image_url=coalesce(_bill,bill_image_url),shopkeeper_notes=_note,alternatives_note=_alternatives WHERE id=o.id;
  END IF;
 ELSIF _action='bill' THEN
  IF o.status NOT IN ('pending','quoted') THEN RAISE EXCEPTION 'منظور شدہ رسید تبدیل نہیں ہو سکتی؛ نئی منظوری ضروری ہے'; END IF;
  UPDATE public.grocery_list_orders SET bill_image_url=_bill WHERE id=o.id;
 ELSIF _action='accept' THEN
  IF o.status<>'quoted' OR o.total_amount<=0 THEN RAISE EXCEPTION 'پہلے حتمی قیمت منگوائیں'; END IF;
  IF _version IS DISTINCT FROM o.quote_version THEN RAISE EXCEPTION 'قیمت بدل گئی ہے؛ نئی قیمت دیکھ کر منظور کریں'; END IF;
  UPDATE public.grocery_list_orders SET status='confirmed',accepted_quote_version=quote_version WHERE id=o.id;
 ELSIF _action='revise' THEN
  IF o.status<>'quoted' OR length(trim(coalesce(_note,'')))<1 THEN RAISE EXCEPTION 'مطلوبہ اشیا لکھیں'; END IF;
  UPDATE public.grocery_list_orders SET status='pending',customer_revision=left(_note,2000),total_amount=0,items_subtotal=NULL,delivery_fee=0,delivery_quote_snapshot=NULL,accepted_quote_version=NULL WHERE id=o.id;
 ELSIF _action='location' THEN
  IF o.status NOT IN ('pending','quoted') OR _lat IS NULL OR _lng IS NULL OR _lat NOT BETWEEN -90 AND 90 OR _lng NOT BETWEEN -180 AND 180 OR nullif(trim(_address),'') IS NULL THEN RAISE EXCEPTION 'قیمت منظور کرنے سے پہلے درست پتہ اور مقام منتخب کریں'; END IF;
  UPDATE public.grocery_list_orders SET delivery_address=_address,delivery_lat=_lat,delivery_lng=_lng,status='pending',total_amount=0,items_subtotal=NULL,delivery_fee=0,delivery_quote_snapshot=NULL,accepted_quote_version=NULL WHERE id=o.id;
 ELSIF _action='ready' THEN
  IF o.status<>'confirmed' OR o.accepted_quote_version IS DISTINCT FROM o.quote_version OR o.total_amount<=0 OR o.delivery_lat IS NULL OR o.delivery_lng IS NULL OR s.pickup_lat IS NULL OR s.pickup_lng IS NULL THEN RAISE EXCEPTION 'منظور شدہ حتمی قیمت اور دکان/کسٹمر کا مقام درکار ہے'; END IF;
  UPDATE public.grocery_list_orders SET status='ready_for_pickup' WHERE id=o.id;
 ELSIF _action='cancel' THEN
  IF o.status NOT IN ('pending','quoted','confirmed') THEN RAISE EXCEPTION 'اس مرحلے میں منسوخی نہیں ہو سکتی'; END IF;
  UPDATE public.grocery_list_orders SET status='cancelled' WHERE id=o.id;
 ELSIF _action='block' THEN
  IF length(trim(coalesce(_note,'')))<3 THEN RAISE EXCEPTION 'بلاک کرنے کی وجہ درج کریں'; END IF;
  INSERT INTO public.shop_customer_blocks(store_id,customer_id,reason) VALUES(o.store_id,o.customer_id,left(_note,500)) ON CONFLICT(store_id,customer_id) DO UPDATE SET reason=excluded.reason;
 ELSE RAISE EXCEPTION 'غلط کارروائی'; END IF;
 PERFORM set_config('app.list_action','off',true); PERFORM set_config('app.bypass_order_guard','off',true);
 SELECT * INTO o FROM public.grocery_list_orders WHERE id=o.id; RETURN o;
END $$;
REVOKE ALL ON FUNCTION public.list_order_action(uuid,text,integer,numeric,numeric,text,text,text,text,double precision,double precision) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.list_order_action(uuid,text,integer,numeric,numeric,text,text,text,text,double precision,double precision) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.guard_list_readiness() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.status IN ('ready_for_pickup','ready') AND (NEW.accepted_quote_version IS DISTINCT FROM NEW.quote_version OR NEW.total_amount<=0 OR NEW.delivery_lat IS NULL OR NEW.delivery_lng IS NULL OR NOT EXISTS(SELECT 1 FROM public.grocery_stores s WHERE s.id=NEW.store_id AND s.pickup_lat IS NOT NULL AND s.pickup_lng IS NOT NULL)) THEN RAISE EXCEPTION 'حتمی منظوری اور دونوں مقامات کے بغیر رائیڈر نہیں بلایا جا سکتا'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER zz_list_readiness BEFORE INSERT OR UPDATE ON public.grocery_list_orders FOR EACH ROW EXECUTE FUNCTION public.guard_list_readiness();