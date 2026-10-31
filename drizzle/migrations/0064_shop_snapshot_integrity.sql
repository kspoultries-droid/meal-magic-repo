CREATE OR REPLACE FUNCTION public.guard_shop_financial_snapshot() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF coalesce(current_setting('app.bypass_order_guard',true),'')<>'on' AND (NEW.delivery_policy_snapshot IS DISTINCT FROM OLD.delivery_policy_snapshot OR NEW.shipping_cost IS DISTINCT FROM OLD.shipping_cost OR NEW.customer_delivery_fee IS DISTINCT FROM OLD.customer_delivery_fee OR NEW.final_amount IS DISTINCT FROM OLD.final_amount OR NEW.inventory_managed IS DISTINCT FROM OLD.inventory_managed OR NEW.delivery_method IS DISTINCT FROM OLD.delivery_method OR NEW.delivery_mode_calc IS DISTINCT FROM OLD.delivery_mode_calc OR NEW.delivery_lat IS DISTINCT FROM OLD.delivery_lat OR NEW.delivery_lng IS DISTINCT FROM OLD.delivery_lng OR NEW.delivery_address IS DISTINCT FROM OLD.delivery_address) THEN RAISE EXCEPTION 'Order location and financial snapshot are fixed; cancel and order again for a different address'; END IF;
 RETURN NEW;
END $$;
-- Do not permit repeated inventory release by reopening a cancelled managed order.
CREATE OR REPLACE FUNCTION public.guard_shop_inventory_fields() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF OLD.inventory_managed AND OLD.status IN ('cancelled','returned_to_store') AND NEW.status IS DISTINCT FROM OLD.status THEN RAISE EXCEPTION 'Closed shop order cannot be reopened'; END IF;
 IF (NEW.inventory_managed IS DISTINCT FROM OLD.inventory_managed OR NEW.sold_recorded IS DISTINCT FROM OLD.sold_recorded) AND coalesce(current_setting('app.bypass_order_guard',true),'')<>'on' THEN RAISE EXCEPTION 'Inventory flags are server managed'; END IF;
 RETURN NEW;
END $$;
DO $patch$ DECLARE def text; BEGIN
 SELECT pg_get_functiondef(p.oid) INTO def FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='notify_order_events';
 def:=replace(def,'_owner_path := ''/grocery/'' || NEW.store_id;','SELECT CASE WHEN store_type=''wholesale'' THEN ''/bazar/'' ELSE ''/grocery/'' END||NEW.store_id||''?tab=orders'' INTO _owner_path FROM public.grocery_stores WHERE id=NEW.store_id;');
 def:=replace(def,''' — فوراً قبول کریں''','CASE WHEN NEW.status=''confirmed'' THEN '' — قبول شدہ؛ پیک کریں'' ELSE '' — تصدیق کریں'' END'); EXECUTE def;
END $patch$;
COMMENT ON COLUMN public.grocery_products.rating IS 'DEPRECATED for display: use shop_public_reviews store-level rating; no item-specific reviews exist.';