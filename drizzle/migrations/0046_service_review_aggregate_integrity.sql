CREATE OR REPLACE FUNCTION public.guard_service_provider_identity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'support') OR (has_role(auth.uid(),'service_manager') AND manages_category(auth.uid(),OLD.category_id)) THEN RETURN NEW; END IF;
 NEW.user_id:=OLD.user_id; NEW.category_id:=OLD.category_id; NEW.city_id:=OLD.city_id; NEW.is_active:=OLD.is_active;
 NEW.rating:=coalesce((SELECT round(avg(rating),2) FROM service_reviews WHERE provider_id=OLD.id),0); NEW.total_reviews:=(SELECT count(*) FROM service_reviews WHERE provider_id=OLD.id);
 RETURN NEW;
END $$;
CREATE POLICY "category managers read quotations" ON public.service_quotations FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'service_manager') AND public.manages_category(auth.uid(),(SELECT s.category_id FROM public.service_bookings b JOIN public.services s ON s.id=b.service_id WHERE b.id=booking_id)));
