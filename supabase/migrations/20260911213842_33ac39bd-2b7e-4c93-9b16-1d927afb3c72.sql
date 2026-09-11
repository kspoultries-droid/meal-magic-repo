
-- =========================================================
-- PHASE 2A: GROCERY PRODUCTION HARDENING (additive, backward compatible)
-- =========================================================

-- 1. weight-based flag on products
ALTER TABLE public.grocery_products
  ADD COLUMN IF NOT EXISTS is_weight_based boolean NOT NULL DEFAULT false;

-- 2. order-level fulfilment fields (original stays in total_amount)
ALTER TABLE public.grocery_cart_orders
  ADD COLUMN IF NOT EXISTS original_amount numeric(14,2),
  ADD COLUMN IF NOT EXISTS items_adjustment numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS substitution_adjustment numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ready_at timestamptz,
  ADD COLUMN IF NOT EXISTS failed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reject_reason text;

UPDATE public.grocery_cart_orders SET original_amount = ROUND(COALESCE(total_amount,0),2)
 WHERE original_amount IS NULL;

-- 3. configurable weight tolerance
INSERT INTO public.app_settings (key, value, label)
SELECT 'grocery_weight_tolerance_percent', '10', 'گروسری وزن کی اجازت شدہ حد (%)'
WHERE NOT EXISTS (SELECT 1 FROM public.app_settings WHERE key = 'grocery_weight_tolerance_percent');

CREATE OR REPLACE FUNCTION public.grocery_weight_tolerance()
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT GREATEST(0, COALESCE((SELECT NULLIF(value,'')::numeric FROM public.app_settings
    WHERE key = 'grocery_weight_tolerance_percent'), 10));
$$;
REVOKE ALL ON FUNCTION public.grocery_weight_tolerance() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grocery_weight_tolerance() TO authenticated, service_role;

-- 4. item-level fulfilment table
CREATE TABLE IF NOT EXISTS public.grocery_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.grocery_cart_orders(id) ON DELETE CASCADE,
  line_index integer NOT NULL DEFAULT 0,
  product_id uuid,
  name text NOT NULL,
  variant_label text,
  is_weight_based boolean NOT NULL DEFAULT false,
  requested_qty numeric(14,3) NOT NULL DEFAULT 1,
  requested_weight_kg numeric(14,3),
  unit_price numeric(14,2) NOT NULL DEFAULT 0,
  original_line_total numeric(14,2) NOT NULL DEFAULT 0,
  picked_qty numeric(14,3),
  picked_weight_kg numeric(14,3),
  final_line_total numeric(14,2) NOT NULL DEFAULT 0,
  adjustment_amount numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'requested',
  approval_status text NOT NULL DEFAULT 'none',
  substitute_product_id uuid,
  substitute_name text,
  substitute_unit_price numeric(14,2),
  substitute_qty numeric(14,3),
  reason text,
  actor_id uuid,
  picked_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, line_index)
);

GRANT SELECT ON public.grocery_order_items TO authenticated;
GRANT ALL ON public.grocery_order_items TO service_role;
ALTER TABLE public.grocery_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Order participants can read grocery order items" ON public.grocery_order_items;
CREATE POLICY "Order participants can read grocery order items"
ON public.grocery_order_items FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.grocery_cart_orders o
    LEFT JOIN public.grocery_stores s ON s.id = o.store_id
    WHERE o.id = grocery_order_items.order_id
      AND (o.customer_id = auth.uid() OR o.rider_id = auth.uid() OR s.owner_id = auth.uid())
  )
  OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'support')
);

CREATE INDEX IF NOT EXISTS idx_goi_order ON public.grocery_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_goi_approval ON public.grocery_order_items(approval_status) WHERE approval_status = 'pending_customer';

DROP TRIGGER IF EXISTS goi_updated_at ON public.grocery_order_items;
CREATE TRIGGER goi_updated_at BEFORE UPDATE ON public.grocery_order_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. materialise items from the jsonb snapshot (idempotent)
CREATE OR REPLACE FUNCTION public.grocery_materialize_items(_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _o public.grocery_cart_orders%ROWTYPE; _it jsonb; _i integer := 0; _wb boolean; _qty numeric; _price numeric;
BEGIN
  SELECT * INTO _o FROM public.grocery_cart_orders WHERE id = _order_id;
  IF _o.id IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.grocery_order_items WHERE order_id = _order_id) THEN RETURN; END IF;

  FOR _it IN SELECT * FROM jsonb_array_elements(COALESCE(_o.items,'[]'::jsonb)) LOOP
    _qty := GREATEST(COALESCE((_it->>'quantity')::numeric, 1), 0);
    _price := ROUND(COALESCE((_it->>'unit_price')::numeric, (_it->>'price')::numeric, 0), 2);
    SELECT COALESCE(is_weight_based,false) INTO _wb FROM public.grocery_products
      WHERE id = NULLIF(_it->>'id','')::uuid;
    INSERT INTO public.grocery_order_items (
      order_id, line_index, product_id, name, variant_label, is_weight_based,
      requested_qty, requested_weight_kg, unit_price, original_line_total, final_line_total
    ) VALUES (
      _order_id, _i, NULLIF(_it->>'id','')::uuid, COALESCE(_it->>'name','آئٹم'),
      NULLIF(_it->>'variant_label',''), COALESCE(_wb,false),
      _qty, CASE WHEN COALESCE(_wb,false) THEN _qty ELSE NULL END,
      _price, ROUND(_price * _qty, 2), ROUND(_price * _qty, 2)
    ) ON CONFLICT (order_id, line_index) DO NOTHING;
    _i := _i + 1;
  END LOOP;
END; $$;
REVOKE ALL ON FUNCTION public.grocery_materialize_items(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grocery_materialize_items(uuid) TO authenticated, service_role;

DO $$ DECLARE _r record; BEGIN
  FOR _r IN SELECT id FROM public.grocery_cart_orders LOOP
    PERFORM public.grocery_materialize_items(_r.id);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.trg_grocery_materialize_items()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.grocery_materialize_items(NEW.id);
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_goi_materialize ON public.grocery_cart_orders;
CREATE TRIGGER trg_goi_materialize AFTER INSERT ON public.grocery_cart_orders
FOR EACH ROW EXECUTE FUNCTION public.trg_grocery_materialize_items();

-- 6. recalculation of the fulfilment total (original values never overwritten)
CREATE OR REPLACE FUNCTION public.grocery_recalc_order(_order_id uuid)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _o public.grocery_cart_orders%ROWTYPE; _i record;
        _sum numeric(14,2) := 0; _orig numeric(14,2) := 0; _subadj numeric(14,2) := 0;
        _itemadj numeric(14,2) := 0; _line numeric(14,2); _tol numeric; _final numeric(14,2);
BEGIN
  SELECT * INTO _o FROM public.grocery_cart_orders WHERE id = _order_id;
  IF _o.id IS NULL THEN RETURN NULL; END IF;
  _tol := public.grocery_weight_tolerance();

  FOR _i IN SELECT * FROM public.grocery_order_items WHERE order_id = _order_id LOOP
    _orig := _orig + _i.original_line_total;

    IF _i.status IN ('unavailable','removed') OR (_i.status = 'substituted' AND _i.approval_status = 'rejected') THEN
      _line := 0;
    ELSIF _i.status = 'substituted' AND _i.approval_status IN ('none','approved') THEN
      _line := ROUND(COALESCE(_i.substitute_unit_price,0) * COALESCE(_i.substitute_qty, _i.requested_qty), 2);
    ELSIF _i.status = 'substituted' THEN            -- pending customer approval
      _line := _i.original_line_total;
    ELSIF _i.is_weight_based AND _i.picked_weight_kg IS NOT NULL
          AND (_i.approval_status <> 'pending_customer')
          AND (_i.approval_status <> 'rejected') THEN
      _line := ROUND(_i.unit_price * _i.picked_weight_kg, 2);
    ELSIF _i.picked_qty IS NOT NULL AND NOT _i.is_weight_based THEN
      _line := ROUND(_i.unit_price * _i.picked_qty, 2);
    ELSE
      _line := _i.original_line_total;
    END IF;

    UPDATE public.grocery_order_items
       SET final_line_total = _line, adjustment_amount = ROUND(_line - original_line_total, 2)
     WHERE id = _i.id;

    IF _i.status = 'substituted' THEN _subadj := _subadj + (_line - _i.original_line_total);
    ELSE _itemadj := _itemadj + (_line - _i.original_line_total); END IF;

    _sum := _sum + _line;
  END LOOP;

  _final := ROUND(GREATEST(0, _sum + COALESCE(_o.delivery_fee,0) - COALESCE(_o.discount_amount,0)), 2);

  PERFORM set_config('app.bypass_order_guard','on', true);
  UPDATE public.grocery_cart_orders
     SET original_amount = COALESCE(original_amount, ROUND(COALESCE(total_amount,0),2)),
         items_adjustment = ROUND(_itemadj,2),
         substitution_adjustment = ROUND(_subadj,2),
         final_amount = _final,
         updated_at = now()
   WHERE id = _order_id;
  PERFORM set_config('app.bypass_order_guard','off', true);

  RETURN _final;
END; $$;
REVOKE ALL ON FUNCTION public.grocery_recalc_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grocery_recalc_order(uuid) TO authenticated, service_role;

-- 7. authorisation helper
CREATE OR REPLACE FUNCTION public.grocery_can_manage_order(_order_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.grocery_cart_orders o
    JOIN public.grocery_stores s ON s.id = o.store_id
    WHERE o.id = _order_id AND s.owner_id = auth.uid()
  ) OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'support');
$$;
REVOKE ALL ON FUNCTION public.grocery_can_manage_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grocery_can_manage_order(uuid) TO authenticated, service_role;

-- 8. picking / weight confirmation
CREATE OR REPLACE FUNCTION public.grocery_pick_item(
  _item_id uuid, _action text, _picked_qty numeric DEFAULT NULL,
  _picked_weight numeric DEFAULT NULL, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _i public.grocery_order_items%ROWTYPE; _tol numeric; _approval text := 'none'; _needs boolean := false;
BEGIN
  SELECT * INTO _i FROM public.grocery_order_items WHERE id = _item_id FOR UPDATE;
  IF _i.id IS NULL THEN RAISE EXCEPTION 'Item not found'; END IF;
  IF NOT public.grocery_can_manage_order(_i.order_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF _action NOT IN ('picking','available','unavailable','picked','packed') THEN
    RAISE EXCEPTION 'Invalid picking action %', _action;
  END IF;
  IF _picked_qty IS NOT NULL AND _picked_qty < 0 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
  IF _picked_weight IS NOT NULL AND _picked_weight <= 0 THEN RAISE EXCEPTION 'Invalid weight'; END IF;

  _tol := public.grocery_weight_tolerance();
  IF _i.is_weight_based AND _picked_weight IS NOT NULL AND COALESCE(_i.requested_weight_kg, _i.requested_qty) > 0 THEN
    _needs := abs(_picked_weight - COALESCE(_i.requested_weight_kg,_i.requested_qty))
              > COALESCE(_i.requested_weight_kg,_i.requested_qty) * _tol / 100.0
              AND _picked_weight > COALESCE(_i.requested_weight_kg,_i.requested_qty);
  END IF;
  IF _needs THEN _approval := 'pending_customer'; END IF;

  UPDATE public.grocery_order_items
     SET status = _action,
         picked_qty = COALESCE(_picked_qty, picked_qty),
         picked_weight_kg = COALESCE(_picked_weight, picked_weight_kg),
         approval_status = CASE WHEN _needs THEN 'pending_customer'
                                WHEN _action = 'unavailable' THEN 'none'
                                ELSE approval_status END,
         reason = COALESCE(_reason, reason),
         actor_id = auth.uid(),
         picked_at = now()
   WHERE id = _item_id;

  PERFORM public.grocery_recalc_order(_i.order_id);

  INSERT INTO public.order_events (order_id, order_type, event_type, from_value, to_value, actor_id)
  VALUES (_i.order_id, 'grocery_cart', 'item', _i.status, _action || COALESCE(' · '||_reason,''), auth.uid());

  RETURN jsonb_build_object('approval_required', _needs);
END; $$;
REVOKE ALL ON FUNCTION public.grocery_pick_item(uuid,text,numeric,numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grocery_pick_item(uuid,text,numeric,numeric,text) TO authenticated, service_role;

-- 9. substitution
CREATE OR REPLACE FUNCTION public.grocery_substitute_item(
  _item_id uuid, _substitute_product_id uuid, _substitute_qty numeric DEFAULT NULL, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _i public.grocery_order_items%ROWTYPE; _o public.grocery_cart_orders%ROWTYPE;
        _p record; _price numeric(14,2); _qty numeric; _new_total numeric(14,2); _approval text;
BEGIN
  SELECT * INTO _i FROM public.grocery_order_items WHERE id = _item_id FOR UPDATE;
  IF _i.id IS NULL THEN RAISE EXCEPTION 'Item not found'; END IF;
  IF NOT public.grocery_can_manage_order(_i.order_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT * INTO _o FROM public.grocery_cart_orders WHERE id = _i.order_id;

  SELECT id, name, price, discount_price, wholesale_price INTO _p
    FROM public.grocery_products
   WHERE id = _substitute_product_id AND store_id = _o.store_id AND is_available = true;
  IF _p.id IS NULL THEN RAISE EXCEPTION 'Invalid substitute product'; END IF;

  _price := ROUND(COALESCE(_p.wholesale_price, _p.discount_price, _p.price), 2);
  _qty := COALESCE(NULLIF(_substitute_qty,0), _i.requested_qty);
  _new_total := ROUND(_price * _qty, 2);
  _approval := CASE WHEN _new_total > _i.original_line_total THEN 'pending_customer' ELSE 'approved' END;

  UPDATE public.grocery_order_items
     SET status = 'substituted',
         substitute_product_id = _p.id, substitute_name = _p.name,
         substitute_unit_price = _price, substitute_qty = _qty,
         approval_status = _approval, reason = COALESCE(_reason, reason),
         actor_id = auth.uid(), picked_at = now(), responded_at = NULL
   WHERE id = _item_id;

  PERFORM public.grocery_recalc_order(_i.order_id);

  INSERT INTO public.order_events (order_id, order_type, event_type, from_value, to_value, actor_id)
  VALUES (_i.order_id, 'grocery_cart', 'substitution', _i.name, _p.name || ' · ' || _approval, auth.uid());

  RETURN jsonb_build_object('approval_required', _approval = 'pending_customer', 'line_total', _new_total);
END; $$;
REVOKE ALL ON FUNCTION public.grocery_substitute_item(uuid,uuid,numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grocery_substitute_item(uuid,uuid,numeric,text) TO authenticated, service_role;

-- 10. customer approval
CREATE OR REPLACE FUNCTION public.grocery_respond_substitution(_item_id uuid, _approve boolean)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _i public.grocery_order_items%ROWTYPE; _cust uuid;
BEGIN
  SELECT * INTO _i FROM public.grocery_order_items WHERE id = _item_id FOR UPDATE;
  IF _i.id IS NULL THEN RAISE EXCEPTION 'Item not found'; END IF;
  SELECT customer_id INTO _cust FROM public.grocery_cart_orders WHERE id = _i.order_id;
  IF _cust IS DISTINCT FROM auth.uid() AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only the customer can approve this change';
  END IF;
  IF _i.approval_status <> 'pending_customer' THEN RAISE EXCEPTION 'Nothing pending'; END IF;

  UPDATE public.grocery_order_items
     SET approval_status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
         status = CASE WHEN _approve THEN status
                       WHEN _i.status = 'substituted' THEN 'removed'
                       ELSE status END,
         picked_weight_kg = CASE WHEN _approve OR _i.status = 'substituted' THEN picked_weight_kg ELSE NULL END,
         responded_at = now()
   WHERE id = _item_id;

  INSERT INTO public.order_events (order_id, order_type, event_type, from_value, to_value, actor_id)
  VALUES (_i.order_id, 'grocery_cart', 'approval', 'pending_customer',
          CASE WHEN _approve THEN 'approved' ELSE 'rejected' END, auth.uid());

  RETURN public.grocery_recalc_order(_i.order_id);
END; $$;
REVOKE ALL ON FUNCTION public.grocery_respond_substitution(uuid,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grocery_respond_substitution(uuid,boolean) TO authenticated, service_role;

-- 11. server-side state machine
CREATE OR REPLACE FUNCTION public.guard_grocery_status_transition()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _from text; _to text; _ok boolean := false; _pending integer;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF coalesce(current_setting('app.bypass_order_guard', true),'') = 'on'
     OR auth.uid() IS NULL OR public.has_role(auth.uid(),'admin') THEN
    RETURN NEW;
  END IF;

  -- legacy synonyms mapped onto the canonical machine
  _from := CASE OLD.status WHEN 'preparing' THEN 'picking' WHEN 'ready' THEN 'ready_for_pickup'
                           WHEN 'out_for_delivery' THEN 'delivering' ELSE OLD.status END;
  _to   := CASE NEW.status WHEN 'preparing' THEN 'picking' WHEN 'ready' THEN 'ready_for_pickup'
                           WHEN 'out_for_delivery' THEN 'delivering' ELSE NEW.status END;

  _ok := CASE _from
    WHEN 'pending'          THEN _to IN ('confirmed','cancelled')
    WHEN 'confirmed'        THEN _to IN ('picking','packed','cancelled')
    WHEN 'picking'          THEN _to IN ('packed','cancelled')
    WHEN 'packed'           THEN _to IN ('ready_for_pickup','cancelled')
    WHEN 'ready_for_pickup' THEN _to IN ('delivering','cancelled')
    WHEN 'delivering'       THEN _to IN ('delivered','failed_delivery')
    WHEN 'failed_delivery'  THEN _to IN ('returned_to_store','cancelled','delivering')
    WHEN 'delivered'        THEN _to IN ('completed')
    ELSE false END;

  IF NOT _ok THEN
    RAISE EXCEPTION 'Invalid grocery order transition % -> %', OLD.status, NEW.status;
  END IF;

  IF _to = 'packed' THEN
    SELECT count(*) INTO _pending FROM public.grocery_order_items
     WHERE order_id = NEW.id AND approval_status = 'pending_customer';
    IF _pending > 0 THEN
      RAISE EXCEPTION 'Customer approval is still pending on % item(s)', _pending;
    END IF;
  END IF;

  IF _to IN ('packed','ready_for_pickup') THEN NEW.final_amount := COALESCE(NEW.final_amount, NEW.total_amount); END IF;
  IF _to = 'ready_for_pickup' AND NEW.ready_at IS NULL THEN NEW.ready_at := now(); END IF;
  IF _to = 'picking' AND NEW.picking_at IS NULL THEN NEW.picking_at := now(); END IF;
  IF _to = 'packed' AND NEW.packed_at IS NULL THEN NEW.packed_at := now(); END IF;
  IF _to = 'failed_delivery' AND NEW.failed_at IS NULL THEN NEW.failed_at := now(); END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS a_guard_grocery_status ON public.grocery_cart_orders;
CREATE TRIGGER a_guard_grocery_status BEFORE UPDATE OF status ON public.grocery_cart_orders
FOR EACH ROW EXECUTE FUNCTION public.guard_grocery_status_transition();

-- 12. dispatch only after the store is ready
CREATE OR REPLACE FUNCTION public.after_grocery_ready_dispatch()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status IN ('ready_for_pickup','ready') AND COALESCE(OLD.status,'') NOT IN ('ready_for_pickup','ready')
     AND NEW.rider_id IS NULL THEN
    PERFORM public.dispatch_next_rider('grocery_cart', NEW.id);
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_grocery_ready_dispatch ON public.grocery_cart_orders;
CREATE TRIGGER trg_grocery_ready_dispatch AFTER UPDATE OF status ON public.grocery_cart_orders
FOR EACH ROW EXECUTE FUNCTION public.after_grocery_ready_dispatch();

-- 13. settlement on the FINAL fulfilment amount (COD collection, commission, refunds)
CREATE OR REPLACE FUNCTION public.zz_post_order_financials()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  _kind text; _total numeric(14,2); _orig numeric(14,2); _fee numeric(14,2); _comm numeric(14,2) := 0;
  _vendor uuid; _rider_pay numeric(14,2) := 0; _method text; _lines jsonb; _pay uuid;
BEGIN
  _kind := CASE TG_TABLE_NAME WHEN 'orders' THEN 'food' ELSE 'grocery_cart' END;
  _method := lower(COALESCE(NEW.payment_method,'cod'));
  _orig := ROUND(COALESCE(NEW.total_amount,0),2);
  _total := CASE WHEN TG_TABLE_NAME = 'grocery_cart_orders'
                 THEN ROUND(COALESCE(NEW.final_amount, NEW.total_amount, 0),2) ELSE _orig END;
  _fee := ROUND(COALESCE(NEW.delivery_fee,0),2);

  IF NEW.status IN ('delivered','completed') AND COALESCE(OLD.status,'') NOT IN ('delivered','completed') THEN
    SELECT commission, vendor_id INTO _comm, _vendor
      FROM public.platform_commissions WHERE order_kind = _kind AND order_id = NEW.id;
    _comm := ROUND(COALESCE(_comm,0),2);
    SELECT ROUND(COALESCE(amount,0),2) INTO _rider_pay
      FROM public.rider_earnings WHERE order_kind = _kind AND order_id = NEW.id;
    _rider_pay := COALESCE(_rider_pay,0);

    _lines := jsonb_build_array(
      jsonb_build_object('account', CASE WHEN _method='cod' THEN 'rider_cash_in_hand' ELSE 'bank_cash' END,
                         'party', COALESCE(NEW.rider_id::text,''), 'direction','debit','amount', _total, 'memo','order collection'),
      jsonb_build_object('account','vendor_payable','party', COALESCE(_vendor::text,''), 'direction','credit',
                         'amount', GREATEST(0, _total - _fee - _comm), 'memo','vendor payable'),
      jsonb_build_object('account','commission_revenue','direction','credit','amount', _comm, 'memo','platform commission'),
      jsonb_build_object('account','delivery_revenue','direction','credit','amount', _fee, 'memo','delivery fee')
    );
    PERFORM public.post_ledger_txn('order_settlement', _kind, NEW.id, _lines, 'Order settled on delivery');

    IF _rider_pay > 0 THEN
      PERFORM public.post_ledger_txn('rider_earning', _kind, NEW.id, jsonb_build_array(
        jsonb_build_object('account','rider_pay_expense','party', COALESCE(NEW.rider_id::text,''), 'direction','debit','amount', _rider_pay),
        jsonb_build_object('account','rider_payable','party', COALESCE(NEW.rider_id::text,''), 'direction','credit','amount', _rider_pay)
      ), 'Rider earning accrued');
    END IF;

    IF _method = 'cod' AND NEW.rider_id IS NOT NULL AND _total > 0 THEN
      INSERT INTO public.rider_cash_journal (rider_id, entry_type, order_kind, order_id, amount, note)
      VALUES (NEW.rider_id, 'collected', _kind, NEW.id, _total, 'COD collected on delivery')
      ON CONFLICT DO NOTHING;
    END IF;

    UPDATE public.payments
      SET status = 'captured', captured_at = COALESCE(captured_at, now()), amount = _total
      WHERE order_kind = _kind AND order_id = NEW.id AND status <> 'captured';

    -- prepaid customer paid more than the fulfilled amount -> partial refund (idempotent)
    IF _method <> 'cod' AND _total < _orig THEN
      SELECT id INTO _pay FROM public.payments WHERE order_kind = _kind AND order_id = NEW.id;
      INSERT INTO public.refunds (payment_id, order_kind, order_id, customer_id, amount, refund_type, reason, status, initiated_by)
      SELECT _pay, _kind, NEW.id, NEW.customer_id, ROUND(_orig - _total,2), 'partial', 'Fulfilment adjustment', 'completed', NULL
      WHERE NOT EXISTS (
        SELECT 1 FROM public.refunds r
        WHERE r.order_kind = _kind AND r.order_id = NEW.id AND r.reason = 'Fulfilment adjustment');
    END IF;
  END IF;

  IF NEW.status = 'cancelled' AND COALESCE(OLD.status,'') <> 'cancelled' THEN
    UPDATE public.payments
      SET status = CASE WHEN status = 'captured' THEN 'refunded' ELSE 'cancelled' END
      WHERE order_kind = _kind AND order_id = NEW.id;
  END IF;

  RETURN NEW;
END; $function$;

-- commission must follow the fulfilled amount, not the requested one
CREATE OR REPLACE FUNCTION public.commission_on_grocery_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_owner uuid; v_type text; v_sector text;
BEGIN
  IF NEW.status IN ('delivered','completed') AND COALESCE(OLD.status,'') NOT IN ('delivered','completed') THEN
    SELECT owner_id, store_type INTO v_owner, v_type FROM public.grocery_stores WHERE id = NEW.store_id;
    v_sector := CASE WHEN v_type = 'wholesale' THEN 'wholesale' ELSE 'grocery' END;
    PERFORM public.record_commission(v_sector, NEW.id, v_owner, NEW.city_id, v_sector,
      COALESCE(NEW.final_amount, NEW.total_amount), COALESCE(NEW.delivery_fee,0), 'easylife');
  END IF;
  RETURN NEW;
END; $function$;

-- rider COD wallet mirror also follows the final amount
CREATE OR REPLACE FUNCTION public.settle_grocery_order_on_delivery()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _amt numeric;
BEGIN
  IF NEW.status IN ('delivered','completed')
     AND COALESCE(OLD.status,'') NOT IN ('delivered','completed')
     AND NEW.rider_id IS NOT NULL THEN
    _amt := COALESCE(NEW.final_amount, NEW.total_amount, 0);
    IF COALESCE(NEW.payment_method,'cod') = 'cod' THEN
      PERFORM set_config('app.bypass_rider_guard','on', true);
      UPDATE public.riders SET wallet_balance = COALESCE(wallet_balance,0) + _amt, updated_at = now()
        WHERE id = NEW.rider_id;
      PERFORM set_config('app.bypass_rider_guard','off', true);
    END IF;
    PERFORM public.record_rider_earning(TG_TABLE_NAME, NEW.id, NEW.rider_id);
  END IF;
  RETURN NEW;
END; $function$;

-- 14. COD shortage / overage reconciliation on remittance approval
CREATE OR REPLACE FUNCTION public.zz_post_remittance_financials()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _short numeric(14,2) := 0; _over numeric(14,2) := 0; _exp numeric(14,2);
BEGIN
  IF NEW.status = 'approved' AND COALESCE(OLD.status,'') <> 'approved' THEN
    INSERT INTO public.rider_cash_journal (rider_id, entry_type, remittance_id, amount, note, created_by)
    VALUES (NEW.rider_id, 'remitted', NEW.id, -ROUND(COALESCE(NEW.amount,0),2), 'Remittance approved', auth.uid())
    ON CONFLICT (entry_type, remittance_id) WHERE remittance_id IS NOT NULL DO NOTHING;

    PERFORM public.post_ledger_txn('rider_remittance', 'remittance', NEW.id, jsonb_build_array(
      jsonb_build_object('account','bank_cash','direction','debit','amount', ROUND(COALESCE(NEW.amount,0),2)),
      jsonb_build_object('account','rider_cash_in_hand','party', NEW.rider_id::text, 'direction','credit','amount', ROUND(COALESCE(NEW.amount,0),2))
    ), 'Rider cash remitted');

    _exp := NEW.expected_amount;
    IF _exp IS NOT NULL THEN
      _short := GREATEST(0, ROUND(_exp - COALESCE(NEW.amount,0), 2));
      _over  := GREATEST(0, ROUND(COALESCE(NEW.amount,0) - _exp, 2));
      NEW.shortage_amount := _short;
      NEW.overage_amount := _over;

      IF _short > 0 THEN
        PERFORM public.post_ledger_txn('cash_shortage', 'remittance', NEW.id, jsonb_build_array(
          jsonb_build_object('account','cash_shortage','party', NEW.rider_id::text,'direction','debit','amount', _short, 'memo','Rider cash shortage receivable'),
          jsonb_build_object('account','rider_cash_in_hand','party', NEW.rider_id::text,'direction','credit','amount', _short)
        ), 'COD shortage recorded');
      ELSIF _over > 0 THEN
        PERFORM public.post_ledger_txn('cash_overage', 'remittance', NEW.id, jsonb_build_array(
          jsonb_build_object('account','rider_cash_in_hand','party', NEW.rider_id::text,'direction','debit','amount', _over),
          jsonb_build_object('account','cash_shortage','party', NEW.rider_id::text,'direction','credit','amount', _over, 'memo','Rider cash overage')
        ), 'COD overage recorded');
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END; $function$;
