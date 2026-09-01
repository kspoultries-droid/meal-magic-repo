
-- 1) FOOD ORDERS: lock all non-progress columns for riders / restaurant owners
CREATE OR REPLACE FUNCTION public.protect_food_order_financials()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('app.bypass_order_guard', true) = 'on'
     OR auth.uid() IS NULL
     OR public.has_role(auth.uid(), 'admin')
     OR public.has_role(auth.uid(), 'support') THEN
    RETURN NEW;
  END IF;

  -- immutable identity / financial columns for every non-admin actor
  NEW.customer_id      := OLD.customer_id;
  NEW.restaurant_id    := OLD.restaurant_id;
  NEW.city_id          := OLD.city_id;
  NEW.total_amount     := OLD.total_amount;
  NEW.discount_amount  := OLD.discount_amount;
  NEW.delivery_fee     := OLD.delivery_fee;
  NEW.delivery_fee_payer := OLD.delivery_fee_payer;
  NEW.voucher_code     := OLD.voucher_code;
  NEW.payment_method   := OLD.payment_method;
  NEW.created_at       := OLD.created_at;

  -- an order may only be claimed while unassigned; nobody may re-assign it
  IF OLD.rider_id IS NOT NULL THEN
    NEW.rider_id := OLD.rider_id;
  END IF;

  -- riders may only advance delivery progress
  IF NOT public.owns_restaurant(auth.uid(), OLD.restaurant_id) THEN
    NEW.delivery_address := OLD.delivery_address;
    NEW.delivery_lat     := OLD.delivery_lat;
    NEW.delivery_lng     := OLD.delivery_lng;
    NEW.receiver_name    := OLD.receiver_name;
    NEW.receiver_phone   := OLD.receiver_phone;
    NEW.is_gift          := OLD.is_gift;
    NEW.notes            := OLD.notes;
  END IF;

  -- Allow the delivery settlement trigger to mark COD orders paid
  IF NOT (NEW.status = 'delivered'
          AND OLD.status IS DISTINCT FROM 'delivered'
          AND COALESCE(NEW.payment_method, 'cod') = 'cod'
          AND NEW.payment_status = 'paid') THEN
    NEW.payment_status := OLD.payment_status;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2) GROCERY CART ORDERS (this function is only attached to grocery_cart_orders)
CREATE OR REPLACE FUNCTION public.protect_order_financials()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _is_store_owner boolean;
BEGIN
  IF current_setting('app.bypass_order_guard', true) = 'on'
     OR auth.uid() IS NULL
     OR public.has_role(auth.uid(), 'admin')
     OR public.has_role(auth.uid(), 'support') THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.grocery_stores s
    WHERE s.id = OLD.store_id AND s.owner_id = auth.uid()
  ) INTO _is_store_owner;

  NEW.customer_id        := OLD.customer_id;
  NEW.store_id           := OLD.store_id;
  NEW.city_id            := OLD.city_id;
  NEW.total_amount       := OLD.total_amount;
  NEW.discount_amount    := OLD.discount_amount;
  NEW.delivery_fee       := OLD.delivery_fee;
  NEW.delivery_fee_payer := OLD.delivery_fee_payer;
  NEW.voucher_code       := OLD.voucher_code;
  NEW.payment_method     := OLD.payment_method;
  NEW.items              := OLD.items;
  NEW.created_at         := OLD.created_at;

  IF OLD.rider_id IS NOT NULL THEN
    NEW.rider_id := OLD.rider_id;
  END IF;

  -- riders may only advance delivery progress, not edit order content
  IF NOT _is_store_owner THEN
    NEW.delivery_address  := OLD.delivery_address;
    NEW.delivery_lat      := OLD.delivery_lat;
    NEW.delivery_lng      := OLD.delivery_lng;
    NEW.receiver_name     := OLD.receiver_name;
    NEW.receiver_phone    := OLD.receiver_phone;
    NEW.is_gift           := OLD.is_gift;
    NEW.notes             := OLD.notes;
    NEW.delivery_method   := OLD.delivery_method;
    NEW.courier_name      := OLD.courier_name;
    NEW.tracking_number   := OLD.tracking_number;
    NEW.courier_tracking_url  := OLD.courier_tracking_url;
    NEW.courier_payment_type  := OLD.courier_payment_type;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3) GROCERY LIST (photo) ORDERS: customers limited to safe fields, riders to progress
CREATE OR REPLACE FUNCTION public.protect_grocery_list_pricing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _is_store_owner boolean;
BEGIN
  IF auth.uid() IS NULL
     OR public.has_role(auth.uid(), 'admin')
     OR public.has_role(auth.uid(), 'support') THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.grocery_stores s
    WHERE s.id = OLD.store_id AND s.owner_id = auth.uid()
  ) INTO _is_store_owner;

  IF _is_store_owner THEN
    NEW.customer_id := OLD.customer_id;
    NEW.store_id    := OLD.store_id;
    NEW.created_at  := OLD.created_at;
    RETURN NEW;
  END IF;

  -- everyone else: pricing and ownership are immutable
  NEW.customer_id       := OLD.customer_id;
  NEW.store_id          := OLD.store_id;
  NEW.total_amount      := OLD.total_amount;
  NEW.delivery_fee      := OLD.delivery_fee;
  NEW.image_url         := OLD.image_url;
  NEW.bill_image_url    := OLD.bill_image_url;
  NEW.shopkeeper_notes  := OLD.shopkeeper_notes;
  NEW.alternatives_note := OLD.alternatives_note;
  NEW.payment_method    := OLD.payment_method;
  NEW.created_at        := OLD.created_at;

  IF OLD.rider_id IS NOT NULL THEN
    NEW.rider_id := OLD.rider_id;
  END IF;

  IF OLD.customer_id = auth.uid() THEN
    -- customer: may edit delivery details, and only cancel an early-stage order
    NEW.rider_id          := OLD.rider_id;
    NEW.rider_assigned_at := OLD.rider_assigned_at;
    NEW.dispatch_state    := OLD.dispatch_state;
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NOT (NEW.status = 'cancelled' AND OLD.status IN ('pending', 'quoted', 'confirmed')) THEN
      NEW.status := OLD.status;
    END IF;
  ELSE
    -- rider: delivery progress only
    NEW.delivery_address := OLD.delivery_address;
    NEW.delivery_lat     := OLD.delivery_lat;
    NEW.delivery_lng     := OLD.delivery_lng;
    NEW.receiver_name    := OLD.receiver_name;
    NEW.receiver_phone   := OLD.receiver_phone;
    NEW.is_gift          := OLD.is_gift;
    NEW.notes            := OLD.notes;
  END IF;

  RETURN NEW;
END;
$function$;

-- 4) SERVICE BOOKINGS: mechanics limited to status / notes / claiming the booking
CREATE OR REPLACE FUNCTION public.protect_service_booking_financials()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL
     OR public.has_role(auth.uid(), 'admin')
     OR public.has_role(auth.uid(), 'support') THEN
    RETURN NEW;
  END IF;

  NEW.customer_id    := OLD.customer_id;
  NEW.total_amount   := OLD.total_amount;
  NEW.advance_fee    := OLD.advance_fee;
  NEW.advance_paid   := OLD.advance_paid;
  NEW.service_id     := OLD.service_id;
  NEW.city_id        := OLD.city_id;
  NEW.payment_method := OLD.payment_method;
  NEW.created_at     := OLD.created_at;

  IF OLD.customer_id IS DISTINCT FROM auth.uid() THEN
    -- mechanic / provider: cannot rewrite the customer's booking details
    NEW.address        := OLD.address;
    NEW.scheduled_date := OLD.scheduled_date;
    NEW.scheduled_time := OLD.scheduled_time;
    NEW.notes          := OLD.notes;
    -- a booking may only be claimed once; no stealing from another provider
    IF OLD.provider_id IS NOT NULL THEN
      NEW.provider_id := OLD.provider_id;
    END IF;
  ELSE
    NEW.provider_id := OLD.provider_id;
  END IF;

  RETURN NEW;
END;
$function$;

-- 5) GROCERY REVIEWS: no anonymous access to reviewer identities
DROP POLICY IF EXISTS "Anyone can read grocery reviews" ON public.grocery_reviews;
CREATE POLICY "Authenticated users read grocery reviews"
ON public.grocery_reviews
FOR SELECT
TO authenticated
USING (true);

REVOKE SELECT ON public.grocery_reviews FROM anon;
