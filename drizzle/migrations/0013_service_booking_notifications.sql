CREATE OR REPLACE FUNCTION public.notify_service_booking_events()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE svc record; u uuid; when_txt text;
BEGIN
  SELECT name, category_id INTO svc FROM services WHERE id = NEW.service_id;
  when_txt := COALESCE(NEW.scheduled_date::text,'') || ' ' || COALESCE(NEW.scheduled_time::text,'');
  IF TG_OP = 'INSERT' THEN
    IF NEW.provider_id IS NOT NULL THEN
      SELECT user_id INTO u FROM service_providers WHERE id = NEW.provider_id;
      IF u IS NOT NULL THEN
        PERFORM notify_user(u, 'service_booking', '🛠️ نئی سروس بکنگ', COALESCE(svc.name,'سروس') || ' — ' || when_txt, '/mechanic');
      END IF;
    ELSE
      FOR u IN SELECT DISTINCT sp.user_id FROM service_providers sp
        WHERE sp.user_id IS NOT NULL AND sp.is_active AND sp.is_available
          AND sp.category_id = svc.category_id
          AND (NEW.city_id IS NULL OR sp.city_id IS NULL OR sp.city_id = NEW.city_id)
      LOOP
        PERFORM notify_user(u, 'service_booking', '🛠️ نئی سروس بکنگ دستیاب', COALESCE(svc.name,'سروس') || ' — ' || when_txt, '/mechanic');
      END LOOP;
    END IF;
    FOR u IN SELECT user_id FROM service_manager_categories WHERE category_id = svc.category_id LOOP
      PERFORM notify_user(u, 'service_booking', '🛠️ نئی بکنگ — کاریگر لگائیں', COALESCE(svc.name,'سروس') || ' — ' || when_txt, '/service-manager');
    END LOOP;
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM notify_user(NEW.customer_id, 'service_booking', 'سروس بکنگ اپڈیٹ',
      COALESCE(svc.name,'سروس') || ': ' || CASE NEW.status
        WHEN 'confirmed' THEN 'تصدیق ہو گئی' WHEN 'in_progress' THEN 'کاریگر کام کر رہا ہے'
        WHEN 'completed' THEN 'مکمل ہو گئی' WHEN 'cancelled' THEN 'منسوخ ہو گئی' ELSE NEW.status END, '/profile');
  ELSIF NEW.provider_id IS DISTINCT FROM OLD.provider_id AND NEW.provider_id IS NOT NULL THEN
    SELECT user_id INTO u FROM service_providers WHERE id = NEW.provider_id;
    IF u IS NOT NULL THEN
      PERFORM notify_user(u, 'service_booking', '🛠️ آپ کو بکنگ دی گئی', COALESCE(svc.name,'سروس') || ' — ' || when_txt, '/mechanic');
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN others THEN RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notify_service_booking_events() FROM public, anon, authenticated;
CREATE TRIGGER trg_notify_service_booking AFTER INSERT OR UPDATE ON public.service_bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_service_booking_events();