CREATE TABLE public.partner_kyc_checks (
  user_id uuid PRIMARY KEY,
  cnic_number text NOT NULL,
  status text NOT NULL,
  ai_score numeric,
  failure_reason text,
  front_path text, back_path text, selfie_path text,
  cnic_expiry date,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.partner_kyc_checks TO authenticated;
GRANT ALL ON public.partner_kyc_checks TO service_role;
ALTER TABLE public.partner_kyc_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or staff read kyc" ON public.partner_kyc_checks FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.validate_partner_application()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _cnic text; _kyc public.partner_kyc_checks%ROWTYPE; _confirmed timestamptz; _risk text[] := '{}';
BEGIN
  IF NEW.applicant_type = 'rider' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND public.has_role(auth.uid(),'admin') THEN RETURN NEW; END IF;
  SELECT email_confirmed_at INTO _confirmed FROM auth.users WHERE id = NEW.user_id;
  IF _confirmed IS NULL THEN RAISE EXCEPTION 'پہلے اپنی ای میل کی تصدیق کریں'; END IF;
  _cnic := regexp_replace(coalesce(NEW.cnic,''), '\D', '', 'g');
  IF length(_cnic) <> 13 THEN RAISE EXCEPTION 'شناختی کارڈ نمبر 13 ہندسوں کا لازمی ہے'; END IF;
  IF length(regexp_replace(coalesce(NEW.phone,''), '\D', '', 'g')) < 10 THEN RAISE EXCEPTION 'درست فون نمبر لازمی ہے'; END IF;
  IF NEW.city_id IS NULL OR length(trim(coalesce(NEW.address,''))) < 10 THEN RAISE EXCEPTION 'شہر اور مکمل پتہ لازمی ہے'; END IF;
  IF NEW.shop_image_url IS NULL THEN RAISE EXCEPTION 'دکان کی تصویر لازمی ہے'; END IF;
  IF NEW.location_lat IS NULL OR NEW.location_lng IS NULL THEN RAISE EXCEPTION 'نقشے پر دکان کی جگہ لازمی ہے'; END IF;
  IF coalesce(NEW.extra->>'account_title','') = '' OR length(regexp_replace(coalesce(NEW.extra->>'account_number',''),'\s','','g')) < 8
     OR coalesce(NEW.extra->>'payout_method','') = '' OR coalesce(NEW.extra->>'cheque_path','') = '' THEN
    RAISE EXCEPTION 'بینک / والٹ اکاؤنٹ اور چیک کی تصویر لازمی ہے';
  END IF;
  SELECT * INTO _kyc FROM public.partner_kyc_checks WHERE user_id = NEW.user_id;
  IF _kyc.user_id IS NULL OR _kyc.cnic_number <> _cnic OR _kyc.status NOT IN ('verified','manual_review') THEN
    RAISE EXCEPTION 'شناختی کارڈ اور لائیو سیلفی کی تصدیق مکمل کریں';
  END IF;
  IF EXISTS (SELECT 1 FROM public.partner_applications a WHERE a.id <> NEW.id AND a.user_id IS DISTINCT FROM NEW.user_id
     AND regexp_replace(coalesce(a.cnic,''),'\D','','g') = _cnic AND a.status <> 'rejected') THEN
    RAISE EXCEPTION 'یہ شناختی کارڈ کسی اور اکاؤنٹ کے پارٹنر کے نام پہلے سے موجود ہے';
  END IF;
  IF EXISTS (SELECT 1 FROM public.partner_applications a WHERE a.id <> NEW.id AND a.user_id IS DISTINCT FROM NEW.user_id
     AND regexp_replace(a.phone,'\D','','g') = regexp_replace(NEW.phone,'\D','','g') AND a.status <> 'rejected') THEN
    _risk := _risk || 'یہی فون کسی اور اکاؤنٹ کی درخواست میں ہے'::text;
  END IF;
  IF EXISTS (SELECT 1 FROM public.partner_applications a WHERE a.id <> NEW.id AND a.user_id IS DISTINCT FROM NEW.user_id
     AND regexp_replace(coalesce(a.extra->>'account_number',''),'\s','','g') = regexp_replace(NEW.extra->>'account_number','\s','','g') AND a.status <> 'rejected') THEN
    _risk := _risk || 'یہی بینک اکاؤنٹ کسی اور اکاؤنٹ کی درخواست میں ہے'::text;
  END IF;
  IF _kyc.status = 'manual_review' THEN _risk := _risk || ('AI تصدیق جزوی: ' || coalesce(_kyc.failure_reason,''))::text; END IF;
  NEW.cnic := _cnic;
  NEW.cnic_image_url := _kyc.front_path;
  NEW.extra := coalesce(NEW.extra,'{}'::jsonb) || jsonb_build_object(
    'cnic_back_url', _kyc.back_path, 'selfie_url', _kyc.selfie_path, 'kyc_status', _kyc.status,
    'kyc_score', _kyc.ai_score, 'cnic_expiry', _kyc.cnic_expiry, 'email_verified', true, 'risk_flags', to_jsonb(_risk));
  RETURN NEW;
END $$;
CREATE TRIGGER trg_validate_partner_application BEFORE INSERT OR UPDATE ON public.partner_applications
  FOR EACH ROW EXECUTE FUNCTION public.validate_partner_application();

CREATE OR REPLACE FUNCTION public.save_partner_payout_on_approve()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' AND NEW.applicant_type <> 'rider'
     AND coalesce(NEW.extra->>'account_number','') <> '' AND NEW.user_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.vendor_bank_accounts WHERE user_id = NEW.user_id
       AND account_number = NEW.extra->>'account_number') THEN
      INSERT INTO public.vendor_bank_accounts (user_id, method, bank_name, account_title, account_number, is_default, is_active)
      VALUES (NEW.user_id, NEW.extra->>'payout_method', NEW.extra->>'bank_name', NEW.extra->>'account_title',
        NEW.extra->>'account_number', NOT EXISTS (SELECT 1 FROM public.vendor_bank_accounts WHERE user_id = NEW.user_id), true);
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_save_partner_payout AFTER UPDATE ON public.partner_applications
  FOR EACH ROW EXECUTE FUNCTION public.save_partner_payout_on_approve();

CREATE OR REPLACE FUNCTION public.get_top_selling_grocery_products(_limit integer DEFAULT 12)
 RETURNS TABLE(id uuid, name text, price numeric, discount_price numeric, image_url text, unit text, store_id uuid, sold_qty numeric)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH sold AS (
    SELECT COALESCE(NULLIF(it->>'product_id',''), NULLIF(it->>'id','')) AS pid,
      SUM(COALESCE((it->>'quantity')::numeric, 1)) AS qty
    FROM public.grocery_cart_orders o
    CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(o.items) = 'array' THEN o.items ELSE '[]'::jsonb END) AS it
    WHERE o.created_at > now() - interval '90 days'
    GROUP BY 1
  )
  SELECT p.id, p.name, p.price, p.discount_price, p.image_url, p.unit, p.store_id, s.qty
  FROM sold s
  JOIN public.grocery_products p ON p.id::text = s.pid
  JOIN public.grocery_stores st ON st.id = p.store_id AND (st.store_type IS NULL OR st.store_type = 'retail')
  WHERE p.is_available IS DISTINCT FROM false
  ORDER BY s.qty DESC
  LIMIT GREATEST(1, LEAST(_limit, 30));
$function$;