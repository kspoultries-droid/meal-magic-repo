CREATE OR REPLACE FUNCTION public.rider_mark_step(_order_id uuid, _step text, _lat double precision DEFAULT NULL, _lng double precision DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE o record; tlat double precision; tlng double precision; d double precision;
BEGIN
  SELECT ord.*, r.pickup_lat AS rlat, r.pickup_lng AS rlng INTO o
  FROM public.orders ord LEFT JOIN public.restaurants r ON r.id = ord.restaurant_id
  WHERE ord.id=_order_id AND ord.rider_id=auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'یہ آرڈر آپ کا نہیں'; END IF;
  IF _step = 'arrived_pickup' THEN tlat := o.rlat; tlng := o.rlng;
  ELSIF _step = 'arrived_customer' THEN tlat := o.delivery_lat; tlng := o.delivery_lng;
  ELSE RAISE EXCEPTION 'غلط مرحلہ'; END IF;
  IF tlat IS NOT NULL AND tlng IS NOT NULL THEN
    IF _lat IS NULL OR _lng IS NULL THEN RAISE EXCEPTION 'لوکیشن آن کریں — مقام کی تصدیق ضروری ہے'; END IF;
    d := public.haversine_km(_lat, _lng, tlat, tlng);
    IF d > 0.15 THEN RAISE EXCEPTION 'آپ ابھی مقام سے % میٹر دور ہیں — 150 میٹر کے اندر پہنچ کر دبائیں', round(d*1000); END IF;
  END IF;
  IF _step = 'arrived_pickup' THEN
    UPDATE public.orders SET rider_arrived_at = COALESCE(rider_arrived_at, now()) WHERE id=_order_id;
  ELSE
    UPDATE public.orders SET arrived_customer_at = COALESCE(arrived_customer_at, now()) WHERE id=_order_id;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.rider_mark_step(uuid,text,double precision,double precision) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rider_mark_step(uuid,text,double precision,double precision) TO authenticated;
DROP FUNCTION IF EXISTS public.rider_mark_step(uuid,text);

ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS auto_print boolean NOT NULL DEFAULT false;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS ntn text;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS tax_percent numeric NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delay_minutes integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false;

CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_id uuid,
  order_kind text NOT NULL DEFAULT 'food',
  category text NOT NULL,
  description text NOT NULL DEFAULT '',
  photo_url text,
  status text NOT NULL DEFAULT 'open',
  staff_reply text,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tickets read" ON public.support_tickets FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "own tickets insert" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'open' AND staff_reply IS NULL);
CREATE POLICY "staff update tickets" ON public.support_tickets FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE INDEX support_tickets_status_idx ON public.support_tickets(status, created_at DESC);

CREATE OR REPLACE FUNCTION public.restaurant_announce_delay(_order_id uuid, _minutes int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE o record;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id=_order_id;
  IF NOT FOUND OR NOT public.owns_restaurant(auth.uid(), o.restaurant_id) THEN RAISE EXCEPTION 'اجازت نہیں'; END IF;
  IF _minutes < 5 OR _minutes > 60 THEN RAISE EXCEPTION '5 سے 60 منٹ'; END IF;
  UPDATE public.orders SET delay_minutes = COALESCE(delay_minutes,0) + _minutes WHERE id=_order_id;
  PERFORM public.notify_user(o.user_id, 'آرڈر میں تاخیر', 'ریسٹورنٹ کے مطابق آپ کا آرڈر تقریباً ' || _minutes || ' منٹ مزید لے گا۔', 'order', '/order/' || _order_id);
END $$;
REVOKE ALL ON FUNCTION public.restaurant_announce_delay(uuid,int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.restaurant_announce_delay(uuid,int) TO authenticated;