CREATE OR REPLACE FUNCTION public.notify_order_events()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _owner uuid; _label text; _short text := left(NEW.id::text, 8); _path text; _owner_path text;
BEGIN
  IF TG_TABLE_NAME = 'orders' THEN
    SELECT owner_id INTO _owner FROM public.restaurants WHERE id = NEW.restaurant_id;
    _path := '/order-tracking/' || NEW.id;
    _owner_path := '/restaurant-dashboard';
  ELSE
    SELECT owner_id INTO _owner FROM public.grocery_stores WHERE id = NEW.store_id;
    _path := '/order-tracking/' || NEW.id || '?type=grocery';
    _owner_path := '/grocery/' || NEW.store_id;
  END IF;

  -- New-order alert: fire once, only when the real total is known
  IF (TG_OP = 'INSERT' AND COALESCE(NEW.total_amount,0) > 0)
     OR (TG_OP = 'UPDATE' AND COALESCE(OLD.total_amount,0) = 0 AND COALESCE(NEW.total_amount,0) > 0) THEN
    PERFORM public.notify_user(_owner, 'new_order', 'نیا آرڈر آیا! #' || _short,
      'Rs ' || round(NEW.total_amount)::text || ' — فوراً قبول کریں', _owner_path);
  END IF;
  IF TG_OP = 'INSERT' THEN RETURN NEW; END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    _label := CASE NEW.status
      WHEN 'confirmed' THEN 'آپ کا آرڈر قبول ہو گیا'
      WHEN 'preparing' THEN 'آپ کا آرڈر تیار ہو رہا ہے'
      WHEN 'picking' THEN 'آپ کا سامان اکٹھا ہو رہا ہے'
      WHEN 'ready' THEN 'آرڈر تیار ہے، رائیڈر آ رہا ہے'
      WHEN 'ready_for_pickup' THEN 'آرڈر تیار ہے، رائیڈر آ رہا ہے'
      WHEN 'delivering' THEN 'رائیڈر آپ کے پاس آ رہا ہے'
      WHEN 'out_for_delivery' THEN 'رائیڈر آپ کے پاس آ رہا ہے'
      WHEN 'delivered' THEN 'آرڈر ڈلیور ہو گیا — شکریہ!'
      WHEN 'cancelled' THEN 'آرڈر منسوخ ہو گیا'
      ELSE NULL END;
    IF _label IS NOT NULL THEN
      PERFORM public.notify_user(NEW.customer_id, 'order_status', _label, 'آرڈر #' || _short, _path);
    END IF;
  END IF;

  IF NEW.rider_id IS DISTINCT FROM OLD.rider_id AND NEW.rider_id IS NOT NULL THEN
    PERFORM public.notify_user(NEW.rider_id, 'assigned', 'آرڈر آپ کو مل گیا #' || _short, 'پک اپ کے لیے روانہ ہوں', '/rider-dashboard');
    PERFORM public.notify_user(_owner, 'rider_assigned', 'رائیڈر مل گیا #' || _short, NULL, _owner_path);
  END IF;

  IF NEW.dispatch_state IS DISTINCT FROM OLD.dispatch_state AND NEW.dispatch_state = 'stuck' THEN
    INSERT INTO public.notifications(user_id, kind, title, body, path)
    SELECT DISTINCT ur.user_id, 'stuck', 'پھنسا ہوا آرڈر #' || _short, 'کوئی رائیڈر نہیں ملا — ہاتھ سے لگائیں', '/admin'
    FROM public.user_roles ur WHERE 'dispatch' = ANY(public.role_permissions(ur.role));
  END IF;
  RETURN NEW;
END $$;