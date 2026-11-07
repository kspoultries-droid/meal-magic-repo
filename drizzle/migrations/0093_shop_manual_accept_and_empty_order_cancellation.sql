DO $patch$
DECLARE def text; old text;
BEGIN
 SELECT pg_get_functiondef('public.create_shop_order(uuid,uuid,text,text,jsonb,double precision,double precision,text,text,boolean,text)'::regprocedure) INTO def;
 old := 'state:=CASE WHEN s.auto_accept_orders AND auto_ok AND q->>''mode''=''rider'' THEN ''confirmed'' ELSE ''pending'' END;';
 IF strpos(def,old)=0 THEN RAISE EXCEPTION 'Checkout acceptance pattern changed'; END IF;
 EXECUTE replace(def,old,'state:=''pending'';');
 SELECT pg_get_functiondef('public.save_shop_order_settings(uuid,boolean,boolean,numeric,double precision,double precision)'::regprocedure) INTO def;
 IF strpos(def,'auto_accept_orders=_auto_accept')=0 THEN RAISE EXCEPTION 'Shop settings pattern changed'; END IF;
 EXECUTE replace(def,'auto_accept_orders=_auto_accept','auto_accept_orders=false');
END $patch$;
COMMENT ON COLUMN public.grocery_stores.auto_accept_orders IS 'DEPRECATED: shop checkout always requires manual acceptance; retained for old clients.';
CREATE OR REPLACE FUNCTION public.grocery_recalc_order(_order_id uuid)
 RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $function$
DECLARE _o public.grocery_cart_orders%ROWTYPE; _i record;
 _sum numeric(14,2):=0; _orig numeric(14,2):=0; _subadj numeric(14,2):=0;
 _itemadj numeric(14,2):=0; _line numeric(14,2); _final numeric(14,2);
 _count integer:=0; _all_unavailable boolean:=true; _cancel boolean:=false; _previous text;
BEGIN
 SELECT * INTO _o FROM public.grocery_cart_orders WHERE id=_order_id FOR UPDATE;
 IF _o.id IS NULL THEN RETURN NULL; END IF;
 FOR _i IN SELECT * FROM public.grocery_order_items WHERE order_id=_order_id ORDER BY id LOOP
  _count:=_count+1; _orig:=_orig+_i.original_line_total;
  IF _i.status IN ('unavailable','removed') OR (_i.status='substituted' AND _i.approval_status='rejected') THEN
   _line:=0;
  ELSE
   _all_unavailable:=false;
   IF _i.status='substituted' AND _i.approval_status IN ('none','approved') THEN
    _line:=ROUND(COALESCE(_i.substitute_unit_price,0)*COALESCE(_i.substitute_qty,_i.requested_qty),2);
   ELSIF _i.status='substituted' THEN _line:=_i.original_line_total;
   ELSIF _i.is_weight_based AND _i.picked_weight_kg IS NOT NULL AND _i.approval_status NOT IN ('pending_customer','rejected') THEN
    _line:=ROUND(_i.unit_price*_i.picked_weight_kg,2);
   ELSIF _i.picked_qty IS NOT NULL AND NOT _i.is_weight_based THEN _line:=ROUND(_i.unit_price*_i.picked_qty,2);
   ELSE _line:=_i.original_line_total;
   END IF;
  END IF;
  UPDATE public.grocery_order_items SET final_line_total=_line,adjustment_amount=ROUND(_line-original_line_total,2) WHERE id=_i.id;
  IF _i.status='substituted' THEN _subadj:=_subadj+(_line-_i.original_line_total);
  ELSE _itemadj:=_itemadj+(_line-_i.original_line_total); END IF;
  _sum:=_sum+_line;
 END LOOP;
 -- Only an explicitly empty, pre-dispatch order is cancelled. Pending alternatives remain active.
 _cancel:=_count>0 AND _all_unavailable AND _o.status IN ('pending','confirmed','picking','preparing','packed') AND _o.rider_id IS NULL AND _o.picked_up_at IS NULL;
 _final:=CASE WHEN _cancel OR (_o.status='cancelled' AND _count>0 AND _all_unavailable) THEN 0
 ELSE ROUND(GREATEST(0,_sum+CASE WHEN _o.delivery_fee_payer='vendor' THEN 0 ELSE COALESCE(_o.delivery_fee,0) END-COALESCE(_o.discount_amount,0)),2) END;
 _previous:=coalesce(current_setting('app.bypass_order_guard',true),'');
 PERFORM set_config('app.bypass_order_guard','on',true);
 UPDATE public.grocery_cart_orders SET
 original_amount=COALESCE(original_amount,ROUND(COALESCE(total_amount,0),2)),
 items_adjustment=ROUND(_itemadj,2),substitution_adjustment=ROUND(_subadj,2),final_amount=_final,
 status=CASE WHEN _cancel THEN 'cancelled' ELSE status END,
 cancellation_reason=CASE WHEN _cancel THEN 'تمام اشیا ناموجود ہیں / All items unavailable' ELSE cancellation_reason END,
 reject_reason=CASE WHEN _cancel THEN 'تمام اشیا ناموجود ہیں / All items unavailable' ELSE reject_reason END,
 updated_at=now() WHERE id=_order_id;
 PERFORM set_config('app.bypass_order_guard',_previous,true);
 RETURN _final;
END $function$;
DO $patch$
DECLARE def text; old text;
BEGIN
 SELECT pg_get_functiondef('public.shop_mark_order_ready(uuid)'::regprocedure) INTO def;
 old:='IF o.status NOT IN (''confirmed'',''picking'',''preparing'',''packed'') THEN RAISE EXCEPTION ''Accept order first''; END IF;';
 IF strpos(def,old)=0 THEN RAISE EXCEPTION 'Readiness status pattern changed'; END IF;
 def:=replace(def,old,old||E'\n PERFORM public.grocery_recalc_order(o.id);\n IF EXISTS(SELECT 1 FROM public.grocery_cart_orders WHERE id=o.id AND status=''cancelled'') THEN RETURN; END IF;');
 old:='PERFORM public.grocery_recalc_order(o.id);'||E'\n IF NOT EXISTS';
 IF strpos(def,old)=0 THEN RAISE EXCEPTION 'Readiness recalculation pattern changed'; END IF;
 def:=replace(def,old,'PERFORM public.grocery_recalc_order(o.id);'||E'\n IF EXISTS(SELECT 1 FROM public.grocery_cart_orders WHERE id=o.id AND status=''cancelled'') THEN RETURN; END IF;\n IF NOT EXISTS');
 EXECUTE def;
END $patch$;