CREATE OR REPLACE FUNCTION public.enforce_customer_order_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _phone text;
  _active int;
BEGIN
  IF auth.uid() IS NULL OR NEW.customer_id IS DISTINCT FROM auth.uid() THEN
    RETURN NEW;
  END IF;
  SELECT regexp_replace(coalesce(phone,''), '\D', '', 'g') INTO _phone FROM profiles WHERE id = NEW.customer_id;
  IF _phone IS NULL OR _phone !~ '^03[0-9]{9}$' THEN
    RAISE EXCEPTION 'درست 11 ہندسوں کا موبائل نمبر (03xxxxxxxxx) درکار ہے' USING ERRCODE = 'P0001';
  END IF;
  SELECT
    (SELECT count(*) FROM orders o JOIN profiles p ON p.id = o.customer_id
      WHERE (o.customer_id = NEW.customer_id OR regexp_replace(coalesce(p.phone,''), '\D', '', 'g') = _phone)
        AND o.status NOT IN ('delivered','cancelled','rejected','completed','refunded'))
  + (SELECT count(*) FROM grocery_cart_orders g JOIN profiles p ON p.id = g.customer_id
      WHERE (g.customer_id = NEW.customer_id OR regexp_replace(coalesce(p.phone,''), '\D', '', 'g') = _phone)
        AND g.status NOT IN ('delivered','cancelled','rejected','completed','refunded'))
  INTO _active;
  IF _active >= 2 THEN
    RAISE EXCEPTION 'ایک وقت میں زیادہ سے زیادہ 2 آرڈر چل سکتے ہیں — پہلے والا مکمل ہونے کا انتظار کریں' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_customer_order_limit ON public.orders;
CREATE TRIGGER trg_customer_order_limit BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.enforce_customer_order_limit();
DROP TRIGGER IF EXISTS trg_customer_order_limit ON public.grocery_cart_orders;
CREATE TRIGGER trg_customer_order_limit BEFORE INSERT ON public.grocery_cart_orders
FOR EACH ROW EXECUTE FUNCTION public.enforce_customer_order_limit();