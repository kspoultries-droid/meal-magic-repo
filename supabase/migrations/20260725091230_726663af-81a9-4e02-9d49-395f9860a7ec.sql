CREATE OR REPLACE FUNCTION public.prevent_order_status_regression()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  old_rank int;
  new_rank int;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status IN ('delivered', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'Completed or cancelled orders cannot be moved back to an earlier stage.';
  END IF;

  IF NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  old_rank := CASE OLD.status
    WHEN 'pending' THEN 0
    WHEN 'confirmed' THEN 1
    WHEN 'preparing' THEN 2
    WHEN 'delivering' THEN 3
    WHEN 'delivered' THEN 4
    WHEN 'completed' THEN 4
    ELSE NULL
  END;

  new_rank := CASE NEW.status
    WHEN 'pending' THEN 0
    WHEN 'confirmed' THEN 1
    WHEN 'preparing' THEN 2
    WHEN 'delivering' THEN 3
    WHEN 'delivered' THEN 4
    WHEN 'completed' THEN 4
    ELSE NULL
  END;

  IF old_rank IS NOT NULL AND new_rank IS NOT NULL AND new_rank < old_rank THEN
    RAISE EXCEPTION 'Order status cannot move backwards.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_order_status_regression_trigger ON public.orders;
CREATE TRIGGER prevent_order_status_regression_trigger
BEFORE UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.prevent_order_status_regression();