CREATE OR REPLACE FUNCTION public.protect_food_order_financials()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('app.bypass_order_guard', true) = 'on'
     OR auth.uid() IS NULL
     OR public.has_role(auth.uid(), 'admin')
     OR public.has_role(auth.uid(), 'support') THEN
    RETURN NEW;
  END IF;

  NEW.customer_id     := OLD.customer_id;
  NEW.total_amount    := OLD.total_amount;
  NEW.discount_amount := OLD.discount_amount;
  NEW.delivery_fee    := OLD.delivery_fee;
  NEW.voucher_code    := OLD.voucher_code;

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