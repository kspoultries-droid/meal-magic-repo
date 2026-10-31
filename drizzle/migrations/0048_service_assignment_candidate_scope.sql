CREATE OR REPLACE FUNCTION public.service_assignment_candidates(_booking_id uuid) RETURNS TABLE(id uuid,name text,rating numeric) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT can_supervise_service(_booking_id) THEN RAISE EXCEPTION 'Category supervisor required'; END IF;
 RETURN QUERY SELECT p.id,p.name,p.rating FROM service_providers p JOIN service_bookings b ON b.id=_booking_id JOIN services s ON s.id=b.service_id WHERE p.is_active AND p.is_available AND p.id IS DISTINCT FROM b.provider_id AND p.city_id IS NOT DISTINCT FROM b.city_id AND (p.category_id=s.category_id OR EXISTS(SELECT 1 FROM services x WHERE x.provider_id=p.id AND x.category_id=s.category_id AND x.is_active)) AND has_role(p.user_id,'mechanic') AND NOT EXISTS(SELECT 1 FROM service_bookings j WHERE j.provider_id=p.id AND j.id<>b.id AND j.status IN ('confirmed','in_progress')) ORDER BY p.rating DESC NULLS LAST LIMIT 50;
END $$;
REVOKE ALL ON FUNCTION public.service_assignment_candidates(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.service_assignment_candidates(uuid) TO authenticated;
