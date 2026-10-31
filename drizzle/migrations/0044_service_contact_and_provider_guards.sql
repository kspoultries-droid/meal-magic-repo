CREATE OR REPLACE FUNCTION public.service_booking_contact(_booking_id uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE b service_bookings; p service_providers; result jsonb;
BEGIN
 SELECT * INTO b FROM service_bookings WHERE id=_booking_id;
 IF b.id IS NULL OR auth.uid() IS NULL THEN RAISE EXCEPTION 'Booking unavailable'; END IF;
 SELECT * INTO p FROM service_providers WHERE id=b.provider_id;
 IF b.customer_id=auth.uid() THEN RETURN jsonb_build_object('name',p.name,'phone',p.phone); END IF;
 IF p.user_id=auth.uid() OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'support') OR (has_role(auth.uid(),'service_manager') AND manages_category(auth.uid(),(SELECT category_id FROM services WHERE id=b.service_id))) THEN SELECT jsonb_build_object('name',full_name,'phone',phone) INTO result FROM profiles WHERE id=b.customer_id; RETURN result; END IF;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.service_booking_contact(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.service_booking_contact(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.guard_service_provider_identity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'support') OR (has_role(auth.uid(),'service_manager') AND manages_category(auth.uid(),OLD.category_id)) THEN RETURN NEW; END IF;
 NEW.user_id:=OLD.user_id; NEW.category_id:=OLD.category_id; NEW.city_id:=OLD.city_id; NEW.is_active:=OLD.is_active; NEW.rating:=OLD.rating; NEW.total_reviews:=OLD.total_reviews;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_service_provider_identity BEFORE UPDATE ON public.service_providers FOR EACH ROW EXECUTE FUNCTION public.guard_service_provider_identity();
REVOKE INSERT,DELETE ON public.service_providers FROM authenticated,anon;
CREATE OR REPLACE FUNCTION public.set_service_availability(_available boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 UPDATE service_providers SET is_available=_available WHERE user_id=auth.uid() AND is_active;
 IF NOT FOUND THEN RAISE EXCEPTION 'Approved provider required'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.set_service_availability(boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_service_availability(boolean) TO authenticated;
