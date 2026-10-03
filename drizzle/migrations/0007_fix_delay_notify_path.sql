CREATE OR REPLACE FUNCTION public.restaurant_announce_delay(_order_id uuid, _minutes int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE o record;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id=_order_id;
  IF NOT FOUND OR NOT public.owns_restaurant(auth.uid(), o.restaurant_id) THEN RAISE EXCEPTION 'اجازت نہیں'; END IF;
  IF _minutes < 5 OR _minutes > 60 THEN RAISE EXCEPTION '5 سے 60 منٹ'; END IF;
  UPDATE public.orders SET delay_minutes = COALESCE(delay_minutes,0) + _minutes WHERE id=_order_id;
  PERFORM public.notify_user(o.user_id, 'order', 'آرڈر میں تاخیر', 'ریسٹورنٹ کے مطابق آپ کا آرڈر تقریباً ' || _minutes || ' منٹ مزید لے گا۔', '/order-tracking/' || _order_id);
END $$;