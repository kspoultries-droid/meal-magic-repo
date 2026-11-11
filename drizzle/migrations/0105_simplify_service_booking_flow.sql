CREATE OR REPLACE FUNCTION public.create_service_booking(_service_id uuid,_address text,_scheduled_date date,_scheduled_time time,_notes text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s services; result uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT * INTO s FROM services WHERE id=_service_id AND is_active;
 IF s.id IS NULL OR NOT EXISTS(SELECT 1 FROM service_categories WHERE id=s.category_id AND is_active) THEN RAISE EXCEPTION 'Service unavailable'; END IF;
 IF s.provider_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM service_providers WHERE id=s.provider_id AND is_active AND is_available) THEN RAISE EXCEPTION 'Provider unavailable'; END IF;
 IF length(trim(coalesce(_address,'')))<5 OR _scheduled_date IS NULL OR _scheduled_time IS NULL OR (_scheduled_date+_scheduled_time)<(now() AT TIME ZONE 'Asia/Karachi') THEN RAISE EXCEPTION 'Valid address and future appointment required'; END IF;
 INSERT INTO service_bookings(service_id,customer_id,address,scheduled_date,scheduled_time,notes,total_amount,advance_fee,city_id) VALUES(s.id,auth.uid(),trim(_address),_scheduled_date,_scheduled_time,_notes,s.price,0,s.city_id) RETURNING id INTO result;
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
  -- Fixed-price jobs may start directly; only a pending (unanswered) quotation blocks work.
  IF b.status<>'confirmed' OR EXISTS(SELECT 1 FROM service_quotations WHERE booking_id=b.id AND status='proposed') THEN RAISE EXCEPTION 'Customer must answer the pending quotation first'; END IF;
  next_status:='in_progress'; next_stage:='working';
 WHEN 'complete' THEN
  IF b.status<>'in_progress' OR length(trim(coalesce(_note,'')))<5 THEN RAISE EXCEPTION 'Completion notes required'; END IF;
  IF _bill_path IS NOT NULL AND NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='service-evidence' AND name=_bill_path AND split_part(name,'/',2)=b.id::text) THEN RAISE EXCEPTION 'Bill upload not found'; END IF;
  next_status:='completed'; next_stage:='completed';
 WHEN 'reject' THEN IF b.status<>'pending' OR (NOT staff AND (SELECT provider_id FROM services WHERE id=b.service_id) IS DISTINCT FROM p.id) THEN RAISE EXCEPTION 'Only the booked provider can reject; contact support for pooled bookings'; END IF; IF length(trim(coalesce(_note,'')))<5 THEN RAISE EXCEPTION 'Reason required'; END IF; next_status:='cancelled'; next_stage:='cancelled';
 WHEN 'cancel' THEN IF length(trim(coalesce(_note,'')))<5 THEN RAISE EXCEPTION 'Cancellation reason required'; END IF; next_status:='cancelled'; next_stage:='cancelled';
 ELSE RAISE EXCEPTION 'Invalid action'; END CASE;
 UPDATE service_bookings SET status=next_status,work_stage=next_stage,final_bill_path=CASE WHEN _action='complete' THEN _bill_path ELSE final_bill_path END,completion_notes=CASE WHEN _action='complete' THEN _note ELSE completion_notes END,completed_at=CASE WHEN _action='complete' THEN now() ELSE completed_at END WHERE id=b.id;
 INSERT INTO service_job_events(booking_id,actor_id,action,note) VALUES(b.id,auth.uid(),_action,nullif(trim(_note),''));
END $$;