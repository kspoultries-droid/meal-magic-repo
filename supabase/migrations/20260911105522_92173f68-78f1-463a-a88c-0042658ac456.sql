CREATE OR REPLACE FUNCTION public.escalate_stale_offers()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE _r record; _n integer := 0;
BEGIN
  FOR _r IN
    SELECT id, order_kind, order_id FROM public.delivery_offers
    WHERE status='offered' AND expires_at < now()
    LIMIT 200
  LOOP
    UPDATE public.delivery_offers SET status='expired', responded_at=now() WHERE id=_r.id;
    PERFORM public.dispatch_next_rider(_r.order_kind, _r.order_id);
    _n := _n + 1;
  END LOOP;

  FOR _r IN
    SELECT o.id AS order_id, 'food'::text AS order_kind FROM public.orders o
     WHERE o.rider_id IS NULL AND o.dispatch_state='stuck'
       AND o.status IN ('confirmed','preparing','ready')
       AND o.created_at > now() - interval '2 hours'
       AND NOT EXISTS (SELECT 1 FROM public.delivery_offers d WHERE d.order_kind='food' AND d.order_id=o.id
                         AND d.status IN ('offered','declined'))
       AND COALESCE((SELECT max(d.expires_at) FROM public.delivery_offers d WHERE d.order_kind='food' AND d.order_id=o.id), o.created_at) < now() - interval '60 seconds'
    UNION ALL
    SELECT o.id AS order_id, 'grocery_cart' FROM public.grocery_cart_orders o
     WHERE o.rider_id IS NULL AND o.dispatch_state='stuck'
       AND o.status NOT IN ('delivered','cancelled','completed')
       AND o.created_at > now() - interval '2 hours'
       AND NOT EXISTS (SELECT 1 FROM public.delivery_offers d WHERE d.order_kind='grocery_cart' AND d.order_id=o.id
                         AND d.status IN ('offered','declined'))
       AND COALESCE((SELECT max(d.expires_at) FROM public.delivery_offers d WHERE d.order_kind='grocery_cart' AND d.order_id=o.id), o.created_at) < now() - interval '60 seconds'
    LIMIT 50
  LOOP
    DELETE FROM public.delivery_offers
     WHERE order_kind=_r.order_kind AND order_id=_r.order_id AND status IN ('expired','cancelled');
    IF _r.order_kind='food' THEN
      UPDATE public.orders SET dispatch_state='none' WHERE id=_r.order_id AND rider_id IS NULL;
    ELSE
      UPDATE public.grocery_cart_orders SET dispatch_state='none' WHERE id=_r.order_id AND rider_id IS NULL;
    END IF;
    PERFORM public.dispatch_next_rider(_r.order_kind, _r.order_id);
    _n := _n + 1;
  END LOOP;

  RETURN _n;
END;
$fn$;