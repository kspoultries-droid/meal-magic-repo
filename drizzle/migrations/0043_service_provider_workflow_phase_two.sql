ALTER TABLE public.services ADD COLUMN IF NOT EXISTS provider_id uuid REFERENCES public.service_providers(id);
ALTER TABLE public.service_bookings ADD COLUMN IF NOT EXISTS work_stage text NOT NULL DEFAULT 'pending';
ALTER TABLE public.service_bookings ADD COLUMN IF NOT EXISTS final_bill_path text;
ALTER TABLE public.service_bookings ADD COLUMN IF NOT EXISTS completion_notes text;
ALTER TABLE public.service_bookings ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS service_booking_id uuid REFERENCES public.service_bookings(id);
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS service_provider_id uuid REFERENCES public.service_providers(id);
CREATE INDEX IF NOT EXISTS services_provider_idx ON public.services(provider_id);
CREATE INDEX IF NOT EXISTS service_booking_provider_idx ON public.service_bookings(provider_id,created_at DESC);
CREATE TABLE public.service_job_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), booking_id uuid NOT NULL REFERENCES public.service_bookings(id) ON DELETE CASCADE, actor_id uuid NOT NULL, action text NOT NULL, note text, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.service_job_events TO authenticated;
GRANT ALL ON public.service_job_events TO service_role;
ALTER TABLE public.service_job_events ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.mechanic_can_access_booking(_user_id uuid,_booking_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS (SELECT 1 FROM service_bookings b JOIN services s ON s.id=b.service_id JOIN service_providers p ON p.user_id=_user_id WHERE b.id=_booking_id AND (b.provider_id=p.id OR (b.provider_id IS NULL AND b.status='pending' AND p.is_active AND p.is_available AND p.city_id IS NOT DISTINCT FROM b.city_id AND (s.provider_id=p.id OR (s.provider_id IS NULL AND p.category_id=s.category_id)))))
$$;
CREATE POLICY "job participants read events" ON public.service_job_events FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.service_bookings b WHERE b.id=booking_id AND (b.customer_id=auth.uid() OR public.mechanic_can_access_booking(auth.uid(),b.id) OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'support') OR public.manages_category(auth.uid(),(SELECT s.category_id FROM public.services s WHERE s.id=b.service_id)))));
CREATE OR REPLACE FUNCTION public.save_provider_service(_id uuid,_name text,_description text,_price numeric,_duration text,_category_id uuid,_image_url text,_active boolean) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p service_providers; result uuid;
BEGIN
 SELECT * INTO p FROM service_providers WHERE user_id=auth.uid() AND is_active LIMIT 1;
 IF p.id IS NULL OR NOT has_role(auth.uid(),'mechanic') THEN RAISE EXCEPTION 'Approved provider required'; END IF;
 IF trim(coalesce(_name,''))='' OR _price IS NULL OR _price<0 OR _price>10000000 OR trim(coalesce(_duration,''))='' THEN RAISE EXCEPTION 'Name, valid price and duration required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM service_categories WHERE id=_category_id AND is_active) OR (p.category_id IS NOT NULL AND p.category_id<>_category_id) THEN RAISE EXCEPTION 'Category not permitted'; END IF;
 IF _id IS NULL THEN INSERT INTO services(name,description,price,duration,category_id,image_url,is_active,city_id,provider_id) VALUES(trim(_name),nullif(trim(_description),''),_price,_duration,_category_id,nullif(_image_url,''),_active,p.city_id,p.id) RETURNING id INTO result;
 ELSE UPDATE services SET name=trim(_name),description=nullif(trim(_description),''),price=_price,duration=_duration,category_id=_category_id,image_url=nullif(_image_url,''),is_active=_active WHERE id=_id AND provider_id=p.id RETURNING id INTO result; IF result IS NULL THEN RAISE EXCEPTION 'Not your service'; END IF; END IF;
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.create_service_booking(_service_id uuid,_address text,_scheduled_date date,_scheduled_time time,_notes text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s services; result uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Verified email required'; END IF;
 SELECT * INTO s FROM services WHERE id=_service_id AND is_active;
 IF s.id IS NULL OR NOT EXISTS(SELECT 1 FROM service_categories WHERE id=s.category_id AND is_active) THEN RAISE EXCEPTION 'Service unavailable'; END IF;
 IF s.provider_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM service_providers WHERE id=s.provider_id AND is_active AND is_available) THEN RAISE EXCEPTION 'Provider unavailable'; END IF;
 IF length(trim(coalesce(_address,'')))<5 OR _scheduled_date IS NULL OR _scheduled_time IS NULL OR (_scheduled_date+_scheduled_time)<(now() AT TIME ZONE 'Asia/Karachi') THEN RAISE EXCEPTION 'Valid address and future appointment required'; END IF;
 INSERT INTO service_bookings(service_id,customer_id,address,scheduled_date,scheduled_time,notes,total_amount,advance_fee,city_id) VALUES(s.id,auth.uid(),trim(_address),_scheduled_date,_scheduled_time,_notes,s.price,round(s.price*0.15),s.city_id) RETURNING id INTO result;
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.service_job_action(_booking_id uuid,_action text,_note text DEFAULT NULL,_bill_path text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b service_bookings; p service_providers; staff boolean; next_status text; next_stage text;
BEGIN
 SELECT * INTO b FROM service_bookings WHERE id=_booking_id FOR UPDATE;
 IF b.id IS NULL OR auth.uid() IS NULL THEN RAISE EXCEPTION 'Booking unavailable'; END IF;
 SELECT * INTO p FROM service_providers WHERE user_id=auth.uid() LIMIT 1;
 staff:=has_role(auth.uid(),'admin') OR has_role(auth.uid(),'support') OR (has_role(auth.uid(),'service_manager') AND manages_category(auth.uid(),(SELECT category_id FROM services WHERE id=b.service_id)));
 IF NOT staff AND NOT (has_role(auth.uid(),'mechanic') AND mechanic_can_access_booking(auth.uid(),b.id)) AND NOT (b.customer_id=auth.uid() AND _action='cancel' AND b.status IN ('pending','confirmed')) THEN RAISE EXCEPTION 'Not authorized'; END IF;
 IF b.status IN ('completed','cancelled') THEN RAISE EXCEPTION 'Booking is closed'; END IF;
 next_status:=b.status; next_stage:=b.work_stage;
 CASE _action
 WHEN 'accept' THEN
  IF b.status<>'pending' OR p.id IS NULL OR NOT p.is_active OR NOT p.is_available OR NOT mechanic_can_access_booking(auth.uid(),b.id) THEN RAISE EXCEPTION 'Cannot accept this booking'; END IF;
  UPDATE service_bookings SET provider_id=p.id WHERE id=b.id;
  next_status:='confirmed'; next_stage:='accepted';
 WHEN 'en_route' THEN IF b.status<>'confirmed' OR b.work_stage NOT IN ('accepted','pending') THEN RAISE EXCEPTION 'Accept booking first'; END IF; next_stage:='en_route';
 WHEN 'inspect' THEN IF b.status<>'confirmed' THEN RAISE EXCEPTION 'Accept booking first'; END IF; next_stage:='inspecting';
 WHEN 'start' THEN
  IF b.status<>'confirmed' OR NOT EXISTS(SELECT 1 FROM service_quotations WHERE booking_id=b.id AND status='approved') OR EXISTS(SELECT 1 FROM service_quotations WHERE booking_id=b.id AND status='proposed') THEN RAISE EXCEPTION 'Customer approval required before work'; END IF;
  next_status:='in_progress'; next_stage:='working';
 WHEN 'complete' THEN
  IF b.status<>'in_progress' OR NOT EXISTS(SELECT 1 FROM service_quotations WHERE booking_id=b.id AND status='approved') OR length(trim(coalesce(_note,'')))<5 OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='service-evidence' AND name=_bill_path AND split_part(name,'/',2)=b.id::text) THEN RAISE EXCEPTION 'Approved quotation, final bill and completion notes required'; END IF;
  next_status:='completed'; next_stage:='completed';
 WHEN 'reject' THEN IF b.status<>'pending' OR (NOT staff AND (SELECT provider_id FROM services WHERE id=b.service_id) IS DISTINCT FROM p.id) THEN RAISE EXCEPTION 'Only the booked provider can reject; contact support for pooled bookings'; END IF; IF length(trim(coalesce(_note,'')))<5 THEN RAISE EXCEPTION 'Reason required'; END IF; next_status:='cancelled'; next_stage:='cancelled';
 WHEN 'cancel' THEN IF length(trim(coalesce(_note,'')))<5 THEN RAISE EXCEPTION 'Cancellation reason required'; END IF; next_status:='cancelled'; next_stage:='cancelled';
 ELSE RAISE EXCEPTION 'Invalid action'; END CASE;
 UPDATE service_bookings SET status=next_status,work_stage=next_stage,final_bill_path=CASE WHEN _action='complete' THEN _bill_path ELSE final_bill_path END,completion_notes=CASE WHEN _action='complete' THEN _note ELSE completion_notes END,completed_at=CASE WHEN _action='complete' THEN now() ELSE completed_at END WHERE id=b.id;
 INSERT INTO service_job_events(booking_id,actor_id,action,note) VALUES(b.id,auth.uid(),_action,nullif(trim(_note),''));
END $$;
REVOKE INSERT,UPDATE ON public.service_bookings FROM authenticated,anon;
REVOKE INSERT,UPDATE ON public.service_quotations FROM authenticated,anon;
CREATE OR REPLACE FUNCTION public.guard_service_quotation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 NEW.total_amount:=round(NEW.labour_amount+NEW.parts_amount+NEW.other_amount,2);
 IF NEW.labour_amount<0 OR NEW.parts_amount<0 OR NEW.other_amount<0 OR NEW.total_amount<=0 OR NEW.total_amount>10000000 THEN RAISE EXCEPTION 'Invalid quotation amount'; END IF;
 IF TG_OP='UPDATE' THEN
  IF (NEW.booking_id,NEW.customer_id,NEW.provider_id,NEW.labour_amount,NEW.parts_amount,NEW.other_amount,NEW.details,NEW.notes,NEW.created_by) IS DISTINCT FROM (OLD.booking_id,OLD.customer_id,OLD.provider_id,OLD.labour_amount,OLD.parts_amount,OLD.other_amount,OLD.details,OLD.notes,OLD.created_by) THEN RAISE EXCEPTION 'Quotation immutable'; END IF;
  IF OLD.status<>'proposed' OR NEW.status NOT IN ('approved','rejected','superseded') THEN RAISE EXCEPTION 'Quotation already decided'; END IF;
  IF NEW.status IN ('approved','rejected') AND auth.uid() IS DISTINCT FROM OLD.customer_id THEN RAISE EXCEPTION 'Only customer can decide'; END IF;
  IF NEW.status='approved' THEN NEW.approved_at:=now(); END IF;
  IF NEW.status='rejected' THEN NEW.rejected_at:=now(); END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.propose_service_quote(_booking_id uuid,_labour numeric,_parts numeric,_other numeric,_notes text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b service_bookings; result uuid;
BEGIN
 SELECT * INTO b FROM service_bookings WHERE id=_booking_id FOR UPDATE;
 IF b.id IS NULL OR b.status<>'confirmed' OR NOT EXISTS(SELECT 1 FROM service_providers WHERE id=b.provider_id AND user_id=auth.uid() AND is_active) THEN RAISE EXCEPTION 'Assigned provider only, before work'; END IF;
 IF length(trim(coalesce(_notes,'')))<5 THEN RAISE EXCEPTION 'Work and parts description required'; END IF;
 IF EXISTS(SELECT 1 FROM service_quotations WHERE booking_id=b.id AND status='approved') THEN RAISE EXCEPTION 'Quotation already approved'; END IF;
 UPDATE service_quotations SET status='superseded' WHERE booking_id=b.id AND status='proposed';
 INSERT INTO service_quotations(booking_id,provider_id,customer_id,labour_amount,parts_amount,other_amount,notes,created_by) VALUES(b.id,auth.uid(),b.customer_id,_labour,_parts,_other,_notes,auth.uid()) RETURNING id INTO result;
 UPDATE service_bookings SET work_stage='awaiting_quote' WHERE id=b.id;
 INSERT INTO service_job_events(booking_id,actor_id,action,note) VALUES(b.id,auth.uid(),'quotation',_notes);
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.protect_service_booking_financials() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'support') THEN RETURN NEW; END IF;
 NEW.customer_id:=OLD.customer_id; NEW.service_id:=OLD.service_id; NEW.city_id:=OLD.city_id; NEW.advance_fee:=OLD.advance_fee; NEW.advance_paid:=OLD.advance_paid; NEW.payment_method:=OLD.payment_method; NEW.created_at:=OLD.created_at;
 IF NEW.total_amount IS DISTINCT FROM OLD.total_amount AND NOT EXISTS(SELECT 1 FROM service_quotations WHERE booking_id=OLD.id AND status='approved' AND total_amount=NEW.total_amount) THEN NEW.total_amount:=OLD.total_amount; END IF;
 NEW.address:=OLD.address; NEW.scheduled_date:=OLD.scheduled_date; NEW.scheduled_time:=OLD.scheduled_time; NEW.notes:=OLD.notes;
 IF OLD.provider_id IS NOT NULL THEN NEW.provider_id:=OLD.provider_id; END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.decide_service_quote(_quotation_id uuid,_approve boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE q service_quotations; b service_bookings;
BEGIN
 SELECT * INTO q FROM service_quotations WHERE id=_quotation_id;
 SELECT * INTO b FROM service_bookings WHERE id=q.booking_id FOR UPDATE;
 SELECT * INTO q FROM service_quotations WHERE id=_quotation_id FOR UPDATE;
 IF q.id IS NULL OR q.customer_id IS DISTINCT FROM auth.uid() OR q.status<>'proposed' OR b.status<>'confirmed' THEN RAISE EXCEPTION 'Pending quotation for your booking required'; END IF;
 UPDATE service_quotations SET status=CASE WHEN _approve THEN 'approved' ELSE 'rejected' END WHERE id=q.id;
 UPDATE service_bookings SET total_amount=CASE WHEN _approve THEN q.total_amount ELSE total_amount END,work_stage=CASE WHEN _approve THEN 'quote_approved' ELSE 'inspecting' END WHERE id=b.id;
 INSERT INTO service_job_events(booking_id,actor_id,action) VALUES(b.id,auth.uid(),CASE WHEN _approve THEN 'quote_approved' ELSE 'quote_rejected' END);
END $$;
CREATE OR REPLACE FUNCTION public.submit_service_review(_booking_id uuid,_rating integer,_comment text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b service_bookings;
BEGIN
 SELECT * INTO b FROM service_bookings WHERE id=_booking_id FOR UPDATE;
 IF b.id IS NULL OR b.customer_id IS DISTINCT FROM auth.uid() OR b.status<>'completed' OR _rating NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'Completed own booking and rating 1-5 required'; END IF;
 INSERT INTO service_reviews(booking_id,service_id,customer_id,provider_id,rating,comment) VALUES(b.id,b.service_id,auth.uid(),b.provider_id,_rating,left(_comment,1000));
 UPDATE service_providers SET rating=(SELECT round(avg(rating),2) FROM service_reviews WHERE provider_id=b.provider_id),total_reviews=(SELECT count(*) FROM service_reviews WHERE provider_id=b.provider_id) WHERE id=b.provider_id;
 UPDATE services SET rating=(SELECT round(avg(rating),2) FROM service_reviews WHERE service_id=b.service_id) WHERE id=b.service_id;
END $$;
REVOKE INSERT,UPDATE,DELETE ON public.service_reviews FROM authenticated,anon;
CREATE POLICY "providers read own reviews" ON public.service_reviews FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.service_providers p WHERE p.id=provider_id AND p.user_id=auth.uid()));
CREATE OR REPLACE FUNCTION public.report_service_issue(_booking_id uuid,_category text,_description text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b service_bookings; result uuid;
BEGIN
 SELECT * INTO b FROM service_bookings WHERE id=_booking_id;
 IF b.id IS NULL OR b.customer_id IS DISTINCT FROM auth.uid() OR _category NOT IN ('behaviour','late','incomplete','quality','payment','other') OR length(trim(coalesce(_description,'')))<5 THEN RAISE EXCEPTION 'Own booking, category and description required'; END IF;
 INSERT INTO support_tickets(user_id,order_id,order_kind,service_booking_id,service_provider_id,category,description) VALUES(auth.uid(),b.id,'service',b.id,b.provider_id,_category,left(_description,1000)) RETURNING id INTO result;
 RETURN result;
END $$;
CREATE POLICY "service evidence upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='service-evidence' AND (storage.foldername(name))[1]=auth.uid()::text AND EXISTS(SELECT 1 FROM public.service_bookings b JOIN public.service_providers p ON p.id=b.provider_id WHERE b.id::text=(storage.foldername(name))[2] AND p.user_id=auth.uid() AND b.status='in_progress'));
CREATE POLICY "service evidence participant read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='service-evidence' AND EXISTS(SELECT 1 FROM public.service_bookings b WHERE b.id::text=(storage.foldername(name))[2] AND (b.customer_id=auth.uid() OR public.mechanic_can_access_booking(auth.uid(),b.id) OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'support'))));
REVOKE ALL ON FUNCTION public.save_provider_service(uuid,text,text,numeric,text,uuid,text,boolean), public.service_job_action(uuid,text,text,text),public.propose_service_quote(uuid,numeric,numeric,numeric,text),public.decide_service_quote(uuid,boolean),public.submit_service_review(uuid,integer,text),public.report_service_issue(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_provider_service(uuid,text,text,numeric,text,uuid,text,boolean), public.service_job_action(uuid,text,text,text),public.propose_service_quote(uuid,numeric,numeric,numeric,text),public.decide_service_quote(uuid,boolean),public.submit_service_review(uuid,integer,text),public.report_service_issue(uuid,text,text) TO authenticated;
