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
    RAISE EXCEPTION 'Completed or cancelled orders cannot be moved back to another stage.';
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

  IF old_rank IS NOT NULL AND new_rank IS NOT NULL AND new_rank <> old_rank + 1 THEN
    RAISE EXCEPTION 'Order status must move one step forward only.';
  END IF;

  RETURN NEW;
END;
$$;