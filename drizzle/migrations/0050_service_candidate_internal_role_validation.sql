CREATE OR REPLACE FUNCTION public.service_provider_is_approved(_provider_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM service_providers p JOIN user_roles r ON r.user_id=p.user_id AND r.role='mechanic' WHERE p.id=_provider_id AND p.is_active) $$;
REVOKE ALL ON FUNCTION public.service_provider_is_approved(uuid) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.service_assignment_candidates(_booking_id uuid) RETURNS TABLE(id uuid,name text,rating numeric) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT can_supervise_service(_booking_id) THEN RAISE EXCEPTION 'Category supervisor required'; END IF;
 RETURN QUERY SELECT p.id,p.name,p.rating FROM service_providers p JOIN service_bookings b ON b.id=_booking_id JOIN services s ON s.id=b.service_id WHERE p.is_active AND p.is_available AND p.id IS DISTINCT FROM b.provider_id AND p.city_id IS NOT DISTINCT FROM b.city_id AND (p.category_id=s.category_id OR EXISTS(SELECT 1 FROM services x WHERE x.provider_id=p.id AND x.category_id=s.category_id AND x.is_active)) AND service_provider_is_approved(p.id) AND NOT EXISTS(SELECT 1 FROM service_bookings j WHERE j.provider_id=p.id AND j.id<>b.id AND j.status IN ('confirmed','in_progress')) ORDER BY p.rating DESC NULLS LAST LIMIT 50;
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
 IF p.id IS NULL OR NOT p.is_active OR NOT p.is_available OR p.id IS NOT DISTINCT FROM b.provider_id OR p.city_id IS DISTINCT FROM b.city_id OR (p.category_id IS DISTINCT FROM s.category_id AND NOT EXISTS(SELECT 1 FROM services WHERE provider_id=p.id AND category_id=s.category_id AND is_active)) OR NOT service_provider_is_approved(p.id) THEN RAISE EXCEPTION 'Available approved same-city category provider required'; END IF;
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
