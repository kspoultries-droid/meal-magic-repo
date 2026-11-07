-- Run with psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f this-file.
-- Exercise the deployed trigger body with isolated temporary fixtures only.
BEGIN;
CREATE TEMP TABLE profiles (id uuid PRIMARY KEY, phone text);
CREATE TEMP TABLE orders (customer_id uuid, status text);
CREATE TEMP TABLE grocery_cart_orders (customer_id uuid, status text);
DO $$
DECLARE body text;
BEGIN
  body := pg_get_functiondef('public.enforce_customer_order_limit()'::regprocedure);
  body := replace(body, 'FUNCTION public.enforce_customer_order_limit()', 'FUNCTION pg_temp.test_customer_order_limit()');
  body := replace(body, 'FROM profiles', 'FROM pg_temp.profiles');
  body := replace(body, 'FROM orders', 'FROM pg_temp.orders');
  body := replace(body, 'FROM grocery_cart_orders', 'FROM pg_temp.grocery_cart_orders');
  body := replace(body, 'JOIN profiles', 'JOIN pg_temp.profiles');
  EXECUTE body;
END $$;
CREATE TRIGGER test_limit BEFORE INSERT ON pg_temp.orders
FOR EACH ROW EXECUTE FUNCTION pg_temp.test_customer_order_limit();
CREATE TRIGGER test_limit BEFORE INSERT ON pg_temp.grocery_cart_orders
FOR EACH ROW EXECUTE FUNCTION pg_temp.test_customer_order_limit();
INSERT INTO pg_temp.profiles VALUES
('11111111-1111-4111-8111-111111111111', '03001234567'),
('22222222-2222-4222-8222-222222222222', '03001234567');
DO $$
DECLARE
  customer uuid := '11111111-1111-4111-8111-111111111111';
  sibling uuid := '22222222-2222-4222-8222-222222222222';
  target text;
  blocked boolean;
BEGIN
  FOREACH target IN ARRAY ARRAY['orders', 'grocery_cart_orders'] LOOP
    -- Two returned shop orders must not consume either of the 2 active slots.
    PERFORM set_config('request.jwt.claim.sub', '', true);
    DELETE FROM pg_temp.orders;
    DELETE FROM pg_temp.grocery_cart_orders;
    INSERT INTO pg_temp.grocery_cart_orders VALUES (customer,'returned_to_store'), (sibling,'returned_to_store');
    PERFORM set_config('request.jwt.claim.sub', customer::text, true);
    EXECUTE format('INSERT INTO pg_temp.%I VALUES ($1, ''pending'')', target) USING customer;
    EXECUTE format('INSERT INTO pg_temp.%I VALUES ($1, ''pending'')', target) USING customer;
    blocked := false;
    BEGIN
      EXECUTE format('INSERT INTO pg_temp.%I VALUES ($1, ''pending'')', target) USING customer;
    EXCEPTION WHEN SQLSTATE 'P0001' THEN
      IF SQLERRM NOT LIKE 'ایک وقت میں زیادہ سے زیادہ 2 آرڈر%' THEN RAISE; END IF;
      blocked := true;
    END;
    IF NOT blocked THEN RAISE EXCEPTION 'Third active order allowed on %', target; END IF;

    -- Cross-service and same-phone active orders still count; an unfinished return is active.
    PERFORM set_config('request.jwt.claim.sub', '', true);
    DELETE FROM pg_temp.orders;
    DELETE FROM pg_temp.grocery_cart_orders;
    INSERT INTO pg_temp.orders VALUES (sibling,'pending');
    INSERT INTO pg_temp.grocery_cart_orders VALUES (customer,'returning_to_store');
    PERFORM set_config('request.jwt.claim.sub', customer::text, true);
    blocked := false;
    BEGIN
      EXECUTE format('INSERT INTO pg_temp.%I VALUES ($1, ''pending'')', target) USING customer;
    EXCEPTION WHEN SQLSTATE 'P0001' THEN
      IF SQLERRM NOT LIKE 'ایک وقت میں زیادہ سے زیادہ 2 آرڈر%' THEN RAISE; END IF;
      blocked := true;
    END;
    IF NOT blocked THEN RAISE EXCEPTION 'Cross-service/phone active limit bypassed on %', target; END IF;
  END LOOP;
  RAISE NOTICE 'PASS: returned orders free both slots; third active order and same-phone cross-service limits preserved';
END $$;
ROLLBACK;