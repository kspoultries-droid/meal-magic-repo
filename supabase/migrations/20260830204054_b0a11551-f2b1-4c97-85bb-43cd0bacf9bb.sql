ALTER TABLE public.service_bookings ADD COLUMN IF NOT EXISTS provider_id uuid REFERENCES public.service_providers(id);

CREATE INDEX IF NOT EXISTS idx_service_bookings_provider ON public.service_bookings(provider_id);

CREATE OR REPLACE FUNCTION public.commission_on_service_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vendor uuid;
BEGIN
  IF NEW.status IN ('completed','delivered') AND COALESCE(OLD.status,'') NOT IN ('completed','delivered') THEN
    SELECT sp.user_id INTO v_vendor
    FROM public.service_providers sp
    WHERE sp.id = NEW.provider_id;

    PERFORM public.record_commission(
      'service', NEW.id, v_vendor, NEW.city_id, 'service',
      NEW.total_amount, 0, 'easylife'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_commission_service ON public.service_bookings;
CREATE TRIGGER trg_commission_service
  AFTER UPDATE ON public.service_bookings
  FOR EACH ROW EXECUTE FUNCTION public.commission_on_service_booking();

REVOKE EXECUTE ON FUNCTION public.commission_on_service_booking() FROM anon, authenticated, public;