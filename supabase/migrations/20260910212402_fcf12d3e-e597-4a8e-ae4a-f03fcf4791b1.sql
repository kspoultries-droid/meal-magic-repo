CREATE OR REPLACE FUNCTION public.accept_delivery_offer(_offer_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _o public.delivery_offers%ROWTYPE;
  _claimed integer := 0;
BEGIN
  PERFORM set_config('app.bypass_order_guard', 'on', true);

  SELECT * INTO _o
  FROM public.delivery_offers
  WHERE id = _offer_id
  FOR UPDATE;

  IF _o.id IS NULL THEN
    RAISE EXCEPTION 'آفر موجود نہیں';
  END IF;
  IF _o.rider_id <> auth.uid() THEN
    RAISE EXCEPTION 'یہ آفر آپ کی نہیں';
  END IF;
  IF _o.status <> 'offered' OR _o.expires_at < now() THEN
    RAISE EXCEPTION 'آفر کا وقت ختم ہو چکا';
  END IF;

  IF _o.order_kind = 'food' THEN
    UPDATE public.orders
       SET rider_id = _o.rider_id, dispatch_state = 'assigned'
     WHERE id = _o.order_id AND rider_id IS NULL;
  ELSIF _o.order_kind = 'grocery_cart' THEN
    UPDATE public.grocery_cart_orders
       SET rider_id = _o.rider_id, rider_assigned_at = now(), dispatch_state = 'assigned'
     WHERE id = _o.order_id AND rider_id IS NULL;
  ELSE
    UPDATE public.grocery_list_orders
       SET rider_id = _o.rider_id, rider_assigned_at = now(), dispatch_state = 'assigned'
     WHERE id = _o.order_id AND rider_id IS NULL;
  END IF;

  GET DIAGNOSTICS _claimed = ROW_COUNT;
  IF _claimed <> 1 THEN
    UPDATE public.delivery_offers
       SET status = 'cancelled', responded_at = now()
     WHERE id = _offer_id;
    RAISE EXCEPTION 'یہ آرڈر کسی دوسرے رائیڈر کو مل چکا ہے';
  END IF;

  UPDATE public.delivery_offers
     SET status = 'accepted', responded_at = now()
   WHERE id = _offer_id;

  UPDATE public.delivery_offers
     SET status = 'cancelled', responded_at = COALESCE(responded_at, now())
   WHERE order_id = _o.order_id
     AND order_kind = _o.order_kind
     AND id <> _offer_id
     AND status = 'offered';

  PERFORM set_config('app.bypass_order_guard', 'off', true);
END;
$function$;

DROP POLICY IF EXISTS "Restaurant owners upload menu images" ON storage.objects;
DROP POLICY IF EXISTS "Restaurant owners update menu images" ON storage.objects;

CREATE POLICY "Restaurant owners upload menu images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] IN ('menu', 'restaurants')
  AND EXISTS (SELECT 1 FROM public.restaurants r WHERE r.owner_id = auth.uid())
);

CREATE POLICY "Restaurant owners update menu images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] IN ('menu', 'restaurants')
  AND EXISTS (SELECT 1 FROM public.restaurants r WHERE r.owner_id = auth.uid())
)
WITH CHECK (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] IN ('menu', 'restaurants')
  AND EXISTS (SELECT 1 FROM public.restaurants r WHERE r.owner_id = auth.uid())
);