CREATE OR REPLACE FUNCTION public.enforce_customer_order_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _phone text;
  _active int;
  _is_bazar boolean := false;
BEGIN
  IF auth.uid() IS NULL OR NEW.customer_id IS DISTINCT FROM auth.uid() THEN
    RETURN NEW;
  END IF;
  SELECT regexp_replace(coalesce(phone,''), '\D', '', 'g') INTO _phone FROM profiles WHERE id = NEW.customer_id;
  IF _phone IS NULL OR _phone !~ '^03[0-9]{9}$' THEN
    RAISE EXCEPTION 'درست 11 ہندسوں کا موبائل نمبر (03xxxxxxxxx) درکار ہے' USING ERRCODE = 'P0001';
  END IF;
  IF TG_TABLE_NAME = 'grocery_cart_orders' THEN
    SELECT s.store_type = 'wholesale' INTO _is_bazar FROM grocery_stores s WHERE s.id = NEW.store_id;
    _is_bazar := coalesce(_is_bazar, false);
  END IF;
  IF _is_bazar THEN
    SELECT count(*) FROM grocery_cart_orders g JOIN profiles p ON p.id = g.customer_id
      JOIN grocery_stores s ON s.id = g.store_id AND s.store_type = 'wholesale'
      WHERE (g.customer_id = NEW.customer_id OR regexp_replace(coalesce(p.phone,''), '\D', '', 'g') = _phone)
        AND g.status NOT IN ('delivered','cancelled','rejected','completed','refunded','returned_to_store')
    INTO _active;
    IF _active >= 10 THEN
      RAISE EXCEPTION 'بازار کے زیادہ سے زیادہ 10 پیکیج ایک وقت میں چل سکتے ہیں — پہلے والے پہنچنے کا انتظار کریں' USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  END IF;
  SELECT
    (SELECT count(*) FROM orders o JOIN profiles p ON p.id = o.customer_id
      WHERE (o.customer_id = NEW.customer_id OR regexp_replace(coalesce(p.phone,''), '\D', '', 'g') = _phone)
        AND o.status NOT IN ('delivered','cancelled','rejected','completed','refunded','returned_to_store'))
  + (SELECT count(*) FROM grocery_cart_orders g JOIN profiles p ON p.id = g.customer_id
      LEFT JOIN grocery_stores s ON s.id = g.store_id
      WHERE (g.customer_id = NEW.customer_id OR regexp_replace(coalesce(p.phone,''), '\D', '', 'g') = _phone)
        AND coalesce(s.store_type,'') <> 'wholesale'
        AND g.status NOT IN ('delivered','cancelled','rejected','completed','refunded','returned_to_store'))
  INTO _active;
  IF _active >= 2 THEN
    RAISE EXCEPTION 'ایک وقت میں زیادہ سے زیادہ 2 آرڈر چل سکتے ہیں — پہلے والا مکمل ہونے کا انتظار کریں' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $function$;