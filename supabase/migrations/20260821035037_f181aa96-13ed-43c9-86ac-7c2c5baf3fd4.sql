
-- 1. Order events (audit log / customer receipt history)
CREATE TABLE public.order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  order_type text NOT NULL CHECK (order_type IN ('food','grocery_cart','grocery_list')),
  event_type text NOT NULL CHECK (event_type IN ('status','shipment','courier')),
  from_value text,
  to_value text,
  courier_name text,
  tracking_number text,
  actor_id uuid,
  source text NOT NULL DEFAULT 'app',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_events_order ON public.order_events (order_id, created_at DESC);

GRANT SELECT ON public.order_events TO authenticated;
GRANT ALL ON public.order_events TO service_role;

ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view all order events"
ON public.order_events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'support'));

CREATE POLICY "Customers can view their own order events"
ON public.order_events FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_events.order_id AND o.customer_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.grocery_cart_orders g WHERE g.id = order_events.order_id AND g.customer_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.grocery_list_orders l WHERE l.id = order_events.order_id AND l.customer_id = auth.uid())
);

-- 2. Logging triggers
CREATE OR REPLACE FUNCTION public.log_order_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _type text;
BEGIN
  _type := CASE TG_TABLE_NAME
    WHEN 'orders' THEN 'food'
    WHEN 'grocery_cart_orders' THEN 'grocery_cart'
    ELSE 'grocery_list' END;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.order_events (order_id, order_type, event_type, from_value, to_value, actor_id)
    VALUES (NEW.id, _type, 'status', OLD.status, NEW.status, auth.uid());
  END IF;

  IF TG_TABLE_NAME = 'grocery_cart_orders' THEN
    IF NEW.shipment_status IS DISTINCT FROM OLD.shipment_status THEN
      INSERT INTO public.order_events (order_id, order_type, event_type, from_value, to_value, courier_name, tracking_number, actor_id)
      VALUES (NEW.id, _type, 'shipment', OLD.shipment_status, NEW.shipment_status, NEW.courier_name, NEW.tracking_number, auth.uid());
    END IF;
    IF NEW.tracking_number IS DISTINCT FROM OLD.tracking_number AND NEW.tracking_number IS NOT NULL THEN
      INSERT INTO public.order_events (order_id, order_type, event_type, from_value, to_value, courier_name, tracking_number, actor_id)
      VALUES (NEW.id, _type, 'courier', OLD.tracking_number, NEW.tracking_number, NEW.courier_name, NEW.tracking_number, auth.uid());
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_order_event AFTER UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.log_order_event();

CREATE TRIGGER trg_log_order_event AFTER UPDATE ON public.grocery_cart_orders
FOR EACH ROW EXECUTE FUNCTION public.log_order_event();

CREATE TRIGGER trg_log_order_event AFTER UPDATE ON public.grocery_list_orders
FOR EACH ROW EXECUTE FUNCTION public.log_order_event();

-- 3. Safer courier sync: never regress a finished order, never go backwards
CREATE OR REPLACE FUNCTION public.sync_courier_shipment_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  old_rank int;
  new_rank int;
BEGIN
  IF NEW.shipment_status IS NOT DISTINCT FROM OLD.shipment_status OR NEW.shipment_status IS NULL THEN
    RETURN NEW;
  END IF;

  old_rank := CASE OLD.shipment_status
    WHEN 'pending' THEN 0 WHEN 'dispatched' THEN 1 WHEN 'in_transit' THEN 2
    WHEN 'out_for_delivery' THEN 3 WHEN 'delivered' THEN 4 WHEN 'returned' THEN 4 ELSE -1 END;
  new_rank := CASE NEW.shipment_status
    WHEN 'pending' THEN 0 WHEN 'dispatched' THEN 1 WHEN 'in_transit' THEN 2
    WHEN 'out_for_delivery' THEN 3 WHEN 'delivered' THEN 4 WHEN 'returned' THEN 4 ELSE -1 END;

  -- Reject unknown statuses and late/out-of-order webhook updates
  IF new_rank = -1 THEN
    NEW.shipment_status := OLD.shipment_status;
    RETURN NEW;
  END IF;
  IF new_rank < old_rank THEN
    NEW.shipment_status := OLD.shipment_status;
    RETURN NEW;
  END IF;

  NEW.courier_updated_at := now();

  -- Terminal order states are never overwritten
  IF OLD.status IN ('delivered','completed','cancelled') THEN
    RETURN NEW;
  END IF;

  IF NEW.shipment_status = 'dispatched' THEN
    NEW.shipped_at := COALESCE(NEW.shipped_at, now());
    NEW.status := 'delivering';
  ELSIF NEW.shipment_status IN ('in_transit','out_for_delivery') THEN
    NEW.status := 'delivering';
  ELSIF NEW.shipment_status = 'delivered' THEN
    NEW.status := 'delivered';
  ELSIF NEW.shipment_status = 'returned' THEN
    NEW.status := 'cancelled';
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Courier webhook retry queue
CREATE TABLE public.courier_sync_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'unknown',
  event_key text NOT NULL,
  tracking_number text,
  shipment_status text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','done','failed')),
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, event_key)
);

CREATE INDEX idx_courier_queue_due ON public.courier_sync_queue (state, next_attempt_at);

GRANT SELECT ON public.courier_sync_queue TO authenticated;
GRANT ALL ON public.courier_sync_queue TO service_role;

ALTER TABLE public.courier_sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view courier queue"
ON public.courier_sync_queue FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER courier_sync_queue_updated_at BEFORE UPDATE ON public.courier_sync_queue
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
