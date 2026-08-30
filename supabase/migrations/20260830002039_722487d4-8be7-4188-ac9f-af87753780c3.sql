
-- 1. Protect financial columns on orders / grocery_cart_orders / service_bookings
CREATE OR REPLACE FUNCTION public.protect_order_financials()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL
     OR public.has_role(auth.uid(), 'admin')
     OR public.has_role(auth.uid(), 'support') THEN
    RETURN NEW;
  END IF;

  NEW.customer_id     := OLD.customer_id;
  NEW.total_amount    := OLD.total_amount;
  NEW.discount_amount := OLD.discount_amount;
  NEW.delivery_fee    := OLD.delivery_fee;
  NEW.voucher_code    := OLD.voucher_code;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_food_order_financials()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL
     OR public.has_role(auth.uid(), 'admin')
     OR public.has_role(auth.uid(), 'support') THEN
    RETURN NEW;
  END IF;

  NEW.customer_id     := OLD.customer_id;
  NEW.total_amount    := OLD.total_amount;
  NEW.discount_amount := OLD.discount_amount;
  NEW.delivery_fee    := OLD.delivery_fee;
  NEW.voucher_code    := OLD.voucher_code;
  -- payment_status may only be set by the delivery settlement trigger / admin
  NEW.payment_status  := OLD.payment_status;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_service_booking_financials()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL
     OR public.has_role(auth.uid(), 'admin')
     OR public.has_role(auth.uid(), 'support') THEN
    RETURN NEW;
  END IF;

  NEW.customer_id  := OLD.customer_id;
  NEW.total_amount := OLD.total_amount;
  NEW.advance_fee  := OLD.advance_fee;
  NEW.advance_paid := OLD.advance_paid;
  NEW.service_id   := OLD.service_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_order_financials ON public.orders;
CREATE TRIGGER trg_protect_order_financials
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.protect_food_order_financials();

DROP TRIGGER IF EXISTS trg_protect_grocery_cart_financials ON public.grocery_cart_orders;
CREATE TRIGGER trg_protect_grocery_cart_financials
BEFORE UPDATE ON public.grocery_cart_orders
FOR EACH ROW EXECUTE FUNCTION public.protect_order_financials();

DROP TRIGGER IF EXISTS trg_protect_service_booking_financials ON public.service_bookings;
CREATE TRIGGER trg_protect_service_booking_financials
BEFORE UPDATE ON public.service_bookings
FOR EACH ROW EXECUTE FUNCTION public.protect_service_booking_financials();

-- 2. SECURITY DEFINER functions must not be callable by anonymous visitors
REVOKE EXECUTE ON FUNCTION public.owns_reel_source(uuid, text, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.owns_reel_source(uuid, text, uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.protect_reel_moderation() FROM anon, authenticated, public;

-- 3. app_settings: only public-safe keys readable
DROP POLICY IF EXISTS "Anyone can view settings" ON public.app_settings;
CREATE POLICY "Public safe settings readable"
ON public.app_settings FOR SELECT
USING (
  key IN ('helpline_phone','whatsapp_number','support_email','support_hours','app_share_url')
  OR public.has_role(auth.uid(), 'admin')
);

-- 4. Reel uploads must be scoped to the uploader's own folder
DROP POLICY IF EXISTS "Vendors upload reel videos to product-images" ON storage.objects;
CREATE POLICY "Vendors upload own reel videos to product-images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = 'reels'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR (
      (storage.foldername(name))[2] = auth.uid()::text
      AND (
        EXISTS (SELECT 1 FROM public.restaurants r WHERE r.owner_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.grocery_stores s WHERE s.owner_id = auth.uid())
      )
    )
  )
);

DROP POLICY IF EXISTS "Vendors upload reels videos" ON storage.objects;
CREATE POLICY "Vendors upload own reels videos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'reels'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR (
      (storage.foldername(name))[1] = auth.uid()::text
      AND (
        public.has_role(auth.uid(), 'restaurant_owner')
        OR EXISTS (SELECT 1 FROM public.grocery_stores s WHERE s.owner_id = auth.uid())
      )
    )
  )
);
