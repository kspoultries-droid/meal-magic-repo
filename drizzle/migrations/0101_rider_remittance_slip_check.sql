ALTER TABLE public.rider_remittances ADD COLUMN IF NOT EXISTS slip_check jsonb;
CREATE UNIQUE INDEX IF NOT EXISTS rider_remittances_ref_unique ON public.rider_remittances (upper(trim(reference_no))) WHERE reference_no IS NOT NULL AND status <> 'rejected';
CREATE OR REPLACE FUNCTION public.guard_rider_remittance_proof()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
 IF NEW.receipt_url IS NULL OR length(trim(NEW.receipt_url))=0 THEN RAISE EXCEPTION 'رسید کی تصویر لازمی ہے'; END IF;
 IF NEW.reference_no IS NULL OR length(trim(NEW.reference_no))<6 THEN RAISE EXCEPTION 'ٹرانزیکشن ID لازمی ہے (کم از کم 6 حروف)'; END IF;
 NEW.reference_no := upper(trim(NEW.reference_no));
 NEW.slip_check := NULL;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_rider_remittance_proof ON public.rider_remittances;
CREATE TRIGGER trg_rider_remittance_proof BEFORE INSERT ON public.rider_remittances FOR EACH ROW EXECUTE FUNCTION public.guard_rider_remittance_proof();