CREATE OR REPLACE FUNCTION public.guard_order_update_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(current_setting('app.bypass_order_guard', true), '') = 'on' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'orders' THEN
    IF NEW.total_amount IS DISTINCT FROM OLD.total_amount
      OR NEW.delivery_fee IS DISTINCT FROM OLD.delivery_fee
      OR NEW.discount_amount IS DISTINCT FROM OLD.discount_amount
      OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
      OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
      OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
      OR NEW.restaurant_id IS DISTINCT FROM OLD.restaurant_id
      OR NEW.rider_id IS DISTINCT FROM OLD.rider_id
      OR NEW.city_id IS DISTINCT FROM OLD.city_id THEN
      RAISE EXCEPTION 'Only administrators can change order ownership or financial fields';
    END IF;
  ELSIF TG_TABLE_NAME = 'grocery_cart_orders' THEN
    IF NEW.total_amount IS DISTINCT FROM OLD.total_amount
      OR NEW.delivery_fee IS DISTINCT FROM OLD.delivery_fee
      OR NEW.discount_amount IS DISTINCT FROM OLD.discount_amount
      OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
      OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
      OR NEW.store_id IS DISTINCT FROM OLD.store_id
      OR NEW.city_id IS DISTINCT FROM OLD.city_id
      OR NEW.rider_id IS DISTINCT FROM OLD.rider_id THEN
      RAISE EXCEPTION 'Only administrators can change grocery order ownership or financial fields';
    END IF;
  ELSIF TG_TABLE_NAME = 'grocery_list_orders' THEN
    IF NEW.total_amount IS DISTINCT FROM OLD.total_amount
      OR NEW.delivery_fee IS DISTINCT FROM OLD.delivery_fee
      OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
      OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
      OR NEW.store_id IS DISTINCT FROM OLD.store_id
      OR NEW.rider_id IS DISTINCT FROM OLD.rider_id THEN
      RAISE EXCEPTION 'Only administrators can change grocery list order ownership or financial fields';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;