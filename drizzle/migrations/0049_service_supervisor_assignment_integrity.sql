CREATE OR REPLACE FUNCTION public.protect_service_booking_financials() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'support') THEN RETURN NEW; END IF;
 NEW.customer_id:=OLD.customer_id; NEW.service_id:=OLD.service_id; NEW.city_id:=OLD.city_id; NEW.advance_fee:=OLD.advance_fee; NEW.advance_paid:=OLD.advance_paid; NEW.payment_method:=OLD.payment_method; NEW.created_at:=OLD.created_at;
 IF NEW.total_amount IS DISTINCT FROM OLD.total_amount AND NOT EXISTS(SELECT 1 FROM service_quotations WHERE booking_id=OLD.id AND status='approved' AND total_amount=NEW.total_amount) THEN NEW.total_amount:=OLD.total_amount; END IF;
 NEW.address:=OLD.address; NEW.scheduled_date:=OLD.scheduled_date; NEW.scheduled_time:=OLD.scheduled_time; NEW.notes:=OLD.notes;
 IF OLD.provider_id IS NOT NULL AND NEW.provider_id IS DISTINCT FROM OLD.provider_id AND NOT (can_supervise_service(OLD.id) AND EXISTS(SELECT 1 FROM service_assignment_history WHERE booking_id=OLD.id AND actor_id=auth.uid() AND new_provider_id=NEW.provider_id AND created_at>=transaction_timestamp())) THEN NEW.provider_id:=OLD.provider_id; END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.serialize_service_acceptance() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.status='confirmed' AND OLD.status='pending' THEN
 PERFORM 1 FROM service_providers WHERE id=NEW.provider_id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM service_bookings WHERE provider_id=NEW.provider_id AND id<>NEW.id AND status IN ('confirmed','in_progress')) THEN RAISE EXCEPTION 'Provider already has active work'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER serialize_service_acceptance BEFORE UPDATE ON public.service_bookings FOR EACH ROW EXECUTE FUNCTION public.serialize_service_acceptance();
CREATE POLICY "category supervisors read service evidence" ON storage.objects FOR SELECT TO authenticated USING(bucket_id='service-evidence' AND EXISTS(SELECT 1 FROM public.service_bookings b WHERE b.id::text=split_part(name,'/',2) AND public.can_supervise_service(b.id)));
