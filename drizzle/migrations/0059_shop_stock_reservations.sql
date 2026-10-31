ALTER TABLE public.grocery_stores ADD COLUMN IF NOT EXISTS auto_accept_orders boolean NOT NULL DEFAULT false;
ALTER TABLE public.grocery_order_items ADD COLUMN IF NOT EXISTS variant_id text;
ALTER TABLE public.grocery_order_items ADD COLUMN IF NOT EXISTS reserved_product_id uuid;
ALTER TABLE public.grocery_order_items ADD COLUMN IF NOT EXISTS reserved_qty numeric NOT NULL DEFAULT 0;
ALTER TABLE public.grocery_order_items ADD COLUMN IF NOT EXISTS reserved_variant_id text;
ALTER TABLE public.grocery_cart_orders ADD COLUMN IF NOT EXISTS inventory_managed boolean NOT NULL DEFAULT false;
ALTER TABLE public.grocery_cart_orders ADD COLUMN IF NOT EXISTS sold_recorded boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION public.adjust_shop_stock(_product uuid,_variant text,_delta numeric) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.grocery_products%ROWTYPE; v jsonb; vs jsonb:='[]'; found boolean:=false;
BEGIN
 IF _delta=0 THEN RETURN; END IF;
 SELECT * INTO p FROM public.grocery_products WHERE id=_product FOR UPDATE;
 IF p.id IS NULL THEN RAISE EXCEPTION 'Product missing'; END IF;
 IF p.stock_qty IS NOT NULL THEN
  IF p.stock_qty+_delta<0 THEN RAISE EXCEPTION 'Insufficient stock: %',p.name; END IF;
  IF _delta<>trunc(_delta) THEN RAISE EXCEPTION 'Stock quantities must be whole units'; END IF;
  UPDATE public.grocery_products SET stock_qty=stock_qty+_delta::integer WHERE id=p.id;
 END IF;
 IF _variant IS NOT NULL THEN
  FOR v IN SELECT value FROM jsonb_array_elements(coalesce(p.variants,'[]')) LOOP
   IF coalesce(v->>'id',v->>'label',v->>'name')=_variant THEN
    found:=true;
    IF coalesce((v->>'is_available')::boolean,true)=false AND _delta<0 THEN RAISE EXCEPTION 'Selected option unavailable'; END IF;
    IF v->>'stock_qty' IS NOT NULL THEN
     IF (v->>'stock_qty')::numeric+_delta<0 THEN RAISE EXCEPTION 'Selected option out of stock'; END IF;
     v:=jsonb_set(v,'{stock_qty}',to_jsonb((v->>'stock_qty')::numeric+_delta));
    END IF;
   END IF;
   vs:=vs||jsonb_build_array(v);
  END LOOP;
  IF NOT found THEN RAISE EXCEPTION 'Invalid option'; END IF;
  UPDATE public.grocery_products SET variants=vs WHERE id=p.id;
 END IF;
END $$;
CREATE OR REPLACE FUNCTION public.reserve_shop_order_item() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.grocery_cart_orders%ROWTYPE; p public.grocery_products%ROWTYPE; target uuid; qty numeric:=0; vid text; j jsonb;
BEGIN
 SELECT * INTO o FROM public.grocery_cart_orders WHERE id=NEW.order_id;
 IF NOT o.inventory_managed THEN RETURN NEW; END IF;
 IF o.status IN ('ready','ready_for_pickup','delivering','out_for_delivery','delivered','completed','cancelled','returned_to_store','failed_delivery') AND TG_OP='UPDATE' AND (NEW.status IS DISTINCT FROM OLD.status OR NEW.picked_qty IS DISTINCT FROM OLD.picked_qty OR NEW.substitute_product_id IS DISTINCT FROM OLD.substitute_product_id OR NEW.substitute_qty IS DISTINCT FROM OLD.substitute_qty OR NEW.picked_weight_kg IS DISTINCT FROM OLD.picked_weight_kg OR NEW.approval_status IS DISTINCT FROM OLD.approval_status) THEN RAISE EXCEPTION 'Order items are closed for changes'; END IF;
 IF TG_OP='INSERT' THEN
  j:=o.items->NEW.line_index; NEW.variant_id:=nullif(j->>'variant_id','');
 ELSE
  NEW.variant_id:=OLD.variant_id;
  IF NEW.product_id IS DISTINCT FROM OLD.product_id OR NEW.order_id IS DISTINCT FROM OLD.order_id OR NEW.requested_qty IS DISTINCT FROM OLD.requested_qty OR NEW.unit_price IS DISTINCT FROM OLD.unit_price THEN RAISE EXCEPTION 'Item identity is immutable'; END IF;
 END IF;
 target:=NEW.product_id; vid:=NEW.variant_id;
 IF NEW.status NOT IN ('unavailable','removed') THEN
  IF NEW.status='substituted' THEN target:=NEW.substitute_product_id; vid:=NULL;
   IF NEW.approval_status='rejected' THEN qty:=0; ELSE qty:=coalesce(NEW.substitute_qty,NEW.requested_qty); END IF;
  ELSE qty:=coalesce(NEW.picked_qty,NEW.requested_qty); END IF;
 END IF;
 IF qty<0 THEN RAISE EXCEPTION 'Invalid item quantity'; END IF;
 PERFORM 1 FROM public.grocery_products WHERE id IN (target,CASE WHEN TG_OP='UPDATE' THEN OLD.reserved_product_id END) ORDER BY id FOR UPDATE;
 IF target IS NOT NULL THEN
  SELECT * INTO p FROM public.grocery_products WHERE id=target;
  IF p.store_id IS DISTINCT FROM o.store_id OR (qty>0 AND NOT p.is_available) THEN RAISE EXCEPTION 'Unavailable product'; END IF;
  IF p.is_weight_based THEN qty:=0; END IF;
 END IF;
 IF TG_OP='UPDATE' THEN PERFORM public.adjust_shop_stock(OLD.reserved_product_id,OLD.reserved_variant_id,OLD.reserved_qty); END IF;
 IF qty>0 THEN PERFORM public.adjust_shop_stock(target,vid,-qty); END IF;
 NEW.reserved_product_id:=CASE WHEN qty>0 THEN target ELSE NULL END; NEW.reserved_qty:=qty; NEW.reserved_variant_id:=vid;
 RETURN NEW;
END $$;
CREATE TRIGGER a_reserve_shop_order_item BEFORE INSERT OR UPDATE ON public.grocery_order_items FOR EACH ROW EXECUTE FUNCTION public.reserve_shop_order_item();
CREATE OR REPLACE FUNCTION public.close_shop_inventory() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE i record; oldflag text;
BEGIN
 IF NOT NEW.inventory_managed THEN RETURN NEW; END IF;
 IF NEW.status IN ('delivered','completed') AND OLD.status NOT IN ('delivered','completed') AND NOT NEW.sold_recorded THEN
  FOR i IN SELECT * FROM public.grocery_order_items WHERE order_id=NEW.id ORDER BY product_id LOOP
   IF i.status NOT IN ('unavailable','removed') AND i.approval_status<>'rejected' THEN
    UPDATE public.grocery_products SET sold_count=coalesce(sold_count,0)+greatest(0,CASE WHEN i.status='substituted' THEN coalesce(i.substitute_qty,i.requested_qty) ELSE coalesce(i.picked_qty,i.requested_qty) END)::integer WHERE id=CASE WHEN i.status='substituted' THEN i.substitute_product_id ELSE i.product_id END;
   END IF;
  END LOOP;
  NEW.sold_recorded:=true;
 END IF;
 IF NEW.status IN ('cancelled','returned_to_store') AND OLD.status NOT IN ('cancelled','returned_to_store','delivered','completed') THEN
  FOR i IN SELECT * FROM public.grocery_order_items WHERE order_id=NEW.id AND reserved_qty>0 ORDER BY reserved_product_id LOOP
   PERFORM public.adjust_shop_stock(i.reserved_product_id,i.reserved_variant_id,i.reserved_qty);
  END LOOP;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER b_close_shop_inventory BEFORE UPDATE OF status ON public.grocery_cart_orders FOR EACH ROW EXECUTE FUNCTION public.close_shop_inventory();
CREATE OR REPLACE FUNCTION public.guard_shop_inventory_fields() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF (NEW.inventory_managed IS DISTINCT FROM OLD.inventory_managed OR NEW.sold_recorded IS DISTINCT FROM OLD.sold_recorded) AND coalesce(current_setting('app.bypass_order_guard',true),'')<>'on' THEN RAISE EXCEPTION 'Inventory flags are server managed'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER aa_guard_shop_inventory_fields BEFORE UPDATE ON public.grocery_cart_orders FOR EACH ROW EXECUTE FUNCTION public.guard_shop_inventory_fields();
CREATE OR REPLACE FUNCTION public.shop_mark_order_ready(_order_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.grocery_cart_orders%ROWTYPE; i record; prev text;
BEGIN
 SELECT * INTO o FROM public.grocery_cart_orders WHERE id=_order_id FOR UPDATE;
 IF auth.uid() IS NULL OR NOT public.grocery_can_manage_order(_order_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
 IF o.status NOT IN ('confirmed','picking','preparing','packed') THEN RAISE EXCEPTION 'Accept order first'; END IF;
 IF EXISTS(SELECT 1 FROM public.grocery_order_items WHERE order_id=o.id AND (approval_status='pending_customer' OR (is_weight_based AND status NOT IN ('unavailable','removed','substituted') AND picked_weight_kg IS NULL))) THEN RAISE EXCEPTION 'Resolve weights and customer approvals first'; END IF;
 FOR i IN SELECT id FROM public.grocery_order_items WHERE order_id=o.id AND status IN ('requested','picking','available') LOOP PERFORM public.grocery_pick_item(i.id,'picked',NULL,NULL,NULL); END LOOP;
 PERFORM public.grocery_recalc_order(o.id);
 IF NOT EXISTS(SELECT 1 FROM public.grocery_order_items WHERE order_id=o.id AND final_line_total>0 AND status NOT IN ('unavailable','removed')) THEN RAISE EXCEPTION 'No deliverable items'; END IF;
 prev:=coalesce(current_setting('app.bypass_order_guard',true),''); PERFORM set_config('app.bypass_order_guard','on',true);
 UPDATE public.grocery_cart_orders SET status='ready_for_pickup',packed_at=coalesce(packed_at,now()),ready_at=coalesce(ready_at,now()) WHERE id=o.id;
 PERFORM set_config('app.bypass_order_guard',prev,true);
END $$;
REVOKE ALL ON FUNCTION public.adjust_shop_stock(uuid,text,numeric),public.reserve_shop_order_item(),public.close_shop_inventory(),public.guard_shop_inventory_fields() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.shop_mark_order_ready(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.shop_mark_order_ready(uuid) TO authenticated,service_role;