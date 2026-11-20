-- PENDING — NOT EXECUTED (migration tool blocked by duplicate snapshot parent 0113/0114).
-- Bug: guard_business_identity reads NEW.category on restaurants (no such column). PL/pgSQL does not
-- short-circuit field lookups, so EVERY non-admin restaurant owner update fails
-- (timing, open/close, delivery mode, print, tax, busy end). Admin saves are unaffected (early return).
-- Fix: read grocery-only fields through jsonb inside a table-specific branch.
-- Rollback: re-create the previous body (saved in docs/pending-sql/phase1-02 rollback note below).
CREATE OR REPLACE FUNCTION public.guard_business_identity()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(),'admin') THEN RETURN NEW; END IF;
  IF NEW.name IS DISTINCT FROM OLD.name THEN RAISE EXCEPTION 'Only admin can change the business name'; END IF;
  IF TG_TABLE_NAME = 'grocery_stores' THEN
    IF (to_jsonb(NEW)->>'category') IS DISTINCT FROM (to_jsonb(OLD)->>'category')
       OR (to_jsonb(NEW)->>'shop_category') IS DISTINCT FROM (to_jsonb(OLD)->>'shop_category') THEN
      RAISE EXCEPTION 'Only admin can change the shop category';
    END IF;
  END IF;
  RETURN NEW;
END $$;
-- Previous body (rollback): identical except line 5 was
--   IF TG_TABLE_NAME='grocery_stores' AND (NEW.category IS DISTINCT FROM OLD.category OR NEW.shop_category IS DISTINCT FROM OLD.shop_category) THEN RAISE EXCEPTION 'Only admin can change the shop category'; END IF;
