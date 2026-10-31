ALTER TABLE public.service_categories ADD COLUMN IF NOT EXISTS work_checklist jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.service_bookings ADD COLUMN IF NOT EXISTS checklist_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.service_bookings ADD COLUMN IF NOT EXISTS checklist_completed text[] NOT NULL DEFAULT '{}';
CREATE TABLE public.service_assignment_history(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),booking_id uuid NOT NULL REFERENCES public.service_bookings(id) ON DELETE CASCADE,old_provider_id uuid,new_provider_id uuid NOT NULL,actor_id uuid NOT NULL,reason text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.service_assignment_history TO authenticated;
GRANT ALL ON public.service_assignment_history TO service_role;
ALTER TABLE public.service_assignment_history ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.can_supervise_service(_booking_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM service_bookings b JOIN services s ON s.id=b.service_id WHERE b.id=_booking_id AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'support') OR (has_role(auth.uid(),'service_manager') AND manages_category(auth.uid(),s.category_id)))) $$;
REVOKE ALL ON FUNCTION public.can_supervise_service(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_supervise_service(uuid) TO authenticated;
CREATE POLICY "supervisors view assignment history" ON public.service_assignment_history FOR SELECT TO authenticated USING(public.can_supervise_service(booking_id));
CREATE POLICY "category managers read service complaints" ON public.support_tickets FOR SELECT TO authenticated USING(service_booking_id IS NOT NULL AND public.has_role(auth.uid(),'service_manager') AND public.can_supervise_service(service_booking_id));
CREATE OR REPLACE FUNCTION public.set_service_checklist(_category_id uuid,_items jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT (has_role(auth.uid(),'admin') OR (has_role(auth.uid(),'service_manager') AND manages_category(auth.uid(),_category_id))) THEN RAISE EXCEPTION 'Category supervisor required'; END IF;
 IF jsonb_typeof(_items)<>'array' OR jsonb_array_length(_items)>30 THEN RAISE EXCEPTION 'Checklist must have at most 30 items'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(_items) i WHERE trim(coalesce(i->>'id',''))='' OR length(trim(coalesce(i->>'en','')))<3 OR length(trim(coalesce(i->>'ur','')))<3) OR (SELECT count(*) FROM jsonb_array_elements(_items))<>(SELECT count(DISTINCT i->>'id') FROM jsonb_array_elements(_items) i) THEN RAISE EXCEPTION 'Unique IDs and bilingual labels required'; END IF;
 UPDATE service_categories SET work_checklist=_items WHERE id=_category_id;
END $$;
CREATE OR REPLACE FUNCTION public.snapshot_service_checklist() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 SELECT c.work_checklist INTO NEW.checklist_snapshot FROM services s JOIN service_categories c ON c.id=s.category_id WHERE s.id=NEW.service_id;
 NEW.checklist_snapshot:=coalesce(NEW.checklist_snapshot,'[]'::jsonb); RETURN NEW;
END $$;
CREATE TRIGGER service_booking_checklist_snapshot BEFORE INSERT ON public.service_bookings FOR EACH ROW EXECUTE FUNCTION public.snapshot_service_checklist();
CREATE OR REPLACE FUNCTION public.complete_service_check(_booking_id uuid,_item_id text,_done boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b service_bookings;
BEGIN
 SELECT * INTO b FROM service_bookings WHERE id=_booking_id FOR UPDATE;
 IF b.status NOT IN ('confirmed','in_progress') OR NOT EXISTS(SELECT 1 FROM service_providers WHERE id=b.provider_id AND user_id=auth.uid() AND is_active) THEN RAISE EXCEPTION 'Assigned active provider required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(b.checklist_snapshot) i WHERE i->>'id'=_item_id) THEN RAISE EXCEPTION 'Checklist item unavailable'; END IF;
 UPDATE service_bookings SET checklist_completed=CASE WHEN _done THEN array_append(array_remove(checklist_completed,_item_id),_item_id) ELSE array_remove(checklist_completed,_item_id) END WHERE id=b.id;
 INSERT INTO service_job_events(booking_id,actor_id,action,note) VALUES(b.id,auth.uid(),'checklist',_item_id||CASE WHEN _done THEN ': complete' ELSE ': reopened' END);
END $$;
CREATE OR REPLACE FUNCTION public.require_service_checklist_completion() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.status='completed' AND OLD.status IS DISTINCT FROM 'completed' AND EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.checklist_snapshot) i WHERE coalesce((i->>'required')::boolean,true) AND NOT (i->>'id'=ANY(NEW.checklist_completed))) THEN RAISE EXCEPTION 'Complete required checklist before closing job'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER require_service_checklist BEFORE UPDATE ON public.service_bookings FOR EACH ROW EXECUTE FUNCTION public.require_service_checklist_completion();
CREATE OR REPLACE FUNCTION public.protect_service_booking_financials() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'support') THEN RETURN NEW; END IF;
 NEW.customer_id:=OLD.customer_id; NEW.service_id:=OLD.service_id; NEW.city_id:=OLD.city_id; NEW.advance_fee:=OLD.advance_fee; NEW.advance_paid:=OLD.advance_paid; NEW.payment_method:=OLD.payment_method; NEW.created_at:=OLD.created_at;
 IF NEW.total_amount IS DISTINCT FROM OLD.total_amount AND NOT EXISTS(SELECT 1 FROM service_quotations WHERE booking_id=OLD.id AND status='approved' AND total_amount=NEW.total_amount) THEN NEW.total_amount:=OLD.total_amount; END IF;
 NEW.address:=OLD.address; NEW.scheduled_date:=OLD.scheduled_date; NEW.scheduled_time:=OLD.scheduled_time; NEW.notes:=OLD.notes;
 IF OLD.provider_id IS NOT NULL AND NEW.provider_id IS DISTINCT FROM OLD.provider_id AND NOT (can_supervise_service(OLD.id) AND EXISTS(SELECT 1 FROM service_assignment_history WHERE booking_id=OLD.id AND actor_id=auth.uid() AND new_provider_id=NEW.provider_id AND created_at>=statement_timestamp())) THEN NEW.provider_id:=OLD.provider_id; END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.guard_service_quotation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 NEW.total_amount:=round(NEW.labour_amount+NEW.parts_amount+NEW.other_amount,2);
 IF NEW.labour_amount<0 OR NEW.parts_amount<0 OR NEW.other_amount<0 OR NEW.total_amount<=0 OR NEW.total_amount>10000000 THEN RAISE EXCEPTION 'Invalid quotation amount'; END IF;
 IF TG_OP='UPDATE' THEN
 IF (NEW.booking_id,NEW.customer_id,NEW.provider_id,NEW.labour_amount,NEW.parts_amount,NEW.other_amount,NEW.details,NEW.notes,NEW.created_by) IS DISTINCT FROM (OLD.booking_id,OLD.customer_id,OLD.provider_id,OLD.labour_amount,OLD.parts_amount,OLD.other_amount,OLD.details,OLD.notes,OLD.created_by) THEN RAISE EXCEPTION 'Quotation immutable'; END IF;
 IF OLD.status='approved' AND NEW.status='superseded' AND can_supervise_service(OLD.booking_id) THEN RETURN NEW; END IF;
 IF OLD.status<>'proposed' OR NEW.status NOT IN ('approved','rejected','superseded') THEN RAISE EXCEPTION 'Quotation already decided'; END IF;
 IF NEW.status IN ('approved','rejected') AND auth.uid() IS DISTINCT FROM OLD.customer_id THEN RAISE EXCEPTION 'Only customer can decide'; END IF;
 IF NEW.status='approved' THEN NEW.approved_at:=now(); END IF; IF NEW.status='rejected' THEN NEW.rejected_at:=now(); END IF;
 END IF; RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.assign_service_provider(_booking_id uuid,_provider_id uuid,_reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b service_bookings; p service_providers; s services; old_user uuid;
BEGIN
 SELECT * INTO b FROM service_bookings WHERE id=_booking_id FOR UPDATE;
 IF NOT can_supervise_service(b.id) THEN RAISE EXCEPTION 'Category supervisor required'; END IF;
 IF b.status IN ('completed','cancelled') THEN RAISE EXCEPTION 'Closed booking cannot be reassigned'; END IF;
 IF b.advance_paid THEN RAISE EXCEPTION 'Paid advance requires finance review before replacement'; END IF;
 IF length(trim(coalesce(_reason,'')))<5 THEN RAISE EXCEPTION 'Replacement reason required'; END IF;
 SELECT * INTO p FROM service_providers WHERE id=_provider_id FOR UPDATE; SELECT * INTO s FROM services WHERE id=b.service_id;
 IF p.id IS NULL OR NOT p.is_active OR NOT p.is_available OR p.id IS NOT DISTINCT FROM b.provider_id OR p.city_id IS DISTINCT FROM b.city_id OR (p.category_id IS DISTINCT FROM s.category_id AND NOT EXISTS(SELECT 1 FROM services WHERE provider_id=p.id AND category_id=s.category_id AND is_active)) OR NOT has_role(p.user_id,'mechanic') THEN RAISE EXCEPTION 'Available approved same-city category provider required'; END IF;
 IF EXISTS(SELECT 1 FROM service_bookings WHERE provider_id=p.id AND id<>b.id AND status IN ('confirmed','in_progress')) THEN RAISE EXCEPTION 'Provider already has active work'; END IF;
 SELECT user_id INTO old_user FROM service_providers WHERE id=b.provider_id;
 INSERT INTO service_assignment_history(booking_id,old_provider_id,new_provider_id,actor_id,reason) VALUES(b.id,b.provider_id,p.id,auth.uid(),trim(_reason));
 UPDATE service_quotations SET status='superseded' WHERE booking_id=b.id AND status IN ('approved','proposed');
 UPDATE service_bookings SET provider_id=p.id,status='pending',work_stage='pending',checklist_completed='{}' WHERE id=b.id;
 INSERT INTO service_job_events(booking_id,actor_id,action,note) VALUES(b.id,auth.uid(),'reassigned',trim(_reason));
 PERFORM notify_user(p.user_id,'service','نئی سروس بکنگ','آپ کو بکنگ دی گئی ہے؛ قبول کرکے نئی کوٹیشن دیں۔','/mechanic-dashboard');
 PERFORM notify_user(old_user,'service','کاریگر تبدیل','یہ بکنگ دوسرے کاریگر کو دی گئی ہے۔','/mechanic-dashboard');
 PERFORM notify_user(b.customer_id,'service','کاریگر تبدیل','نئے کاریگر کی کوٹیشن آپ کی منظوری کے بعد ہی کام شروع ہوگا۔','/order-tracking/'||b.id);
END $$;
CREATE OR REPLACE FUNCTION public.resolve_service_issue(_ticket_id uuid,_reply text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t support_tickets;
BEGIN
 SELECT * INTO t FROM support_tickets WHERE id=_ticket_id FOR UPDATE;
 IF t.service_booking_id IS NULL OR NOT can_supervise_service(t.service_booking_id) OR length(trim(coalesce(_reply,'')))<5 THEN RAISE EXCEPTION 'Authorized supervisor and reply required'; END IF;
 UPDATE support_tickets SET status='resolved',staff_reply=trim(_reply),resolved_by=auth.uid(),resolved_at=now() WHERE id=t.id;
 INSERT INTO service_job_events(booking_id,actor_id,action,note) VALUES(t.service_booking_id,auth.uid(),'complaint_resolved',trim(_reply));
END $$;
REVOKE ALL ON FUNCTION public.set_service_checklist(uuid,jsonb),public.complete_service_check(uuid,text,boolean),public.assign_service_provider(uuid,uuid,text),public.resolve_service_issue(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_service_checklist(uuid,jsonb),public.complete_service_check(uuid,text,boolean),public.assign_service_provider(uuid,uuid,text),public.resolve_service_issue(uuid,text) TO authenticated;
