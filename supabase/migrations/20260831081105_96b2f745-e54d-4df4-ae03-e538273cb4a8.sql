CREATE OR REPLACE FUNCTION public.can_access_order_chat(_user_id uuid, _kind text, _order_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE ok boolean := false;
BEGIN
  IF public.has_role(_user_id,'admin') OR public.has_role(_user_id,'support') THEN RETURN true; END IF;
  IF _kind = 'food' THEN
    SELECT EXISTS(SELECT 1 FROM public.orders o WHERE o.id=_order_id AND (o.customer_id=_user_id OR o.rider_id=_user_id)) INTO ok;
  ELSIF _kind = 'grocery' THEN
    SELECT EXISTS(SELECT 1 FROM public.grocery_cart_orders o WHERE o.id=_order_id AND (o.customer_id=_user_id OR o.rider_id=_user_id)) INTO ok;
  ELSIF _kind = 'grocery_list' THEN
    SELECT EXISTS(SELECT 1 FROM public.grocery_list_orders o WHERE o.id=_order_id AND (o.customer_id=_user_id OR o.rider_id=_user_id)) INTO ok;
  END IF;
  RETURN ok;
END; $$;

CREATE TABLE public.order_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  order_kind text NOT NULL DEFAULT 'food' CHECK (order_kind IN ('food','grocery','grocery_list')),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role text NOT NULL DEFAULT 'customer' CHECK (sender_role IN ('customer','rider','admin','support')),
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 1000),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_messages_order ON public.order_messages(order_kind, order_id, created_at);

GRANT SELECT, INSERT, UPDATE ON public.order_messages TO authenticated;
GRANT ALL ON public.order_messages TO service_role;

ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants read order messages" ON public.order_messages
FOR SELECT TO authenticated
USING (public.can_access_order_chat(auth.uid(), order_kind, order_id));

CREATE POLICY "Participants send order messages" ON public.order_messages
FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid() AND public.can_access_order_chat(auth.uid(), order_kind, order_id));

CREATE POLICY "Recipients mark read" ON public.order_messages
FOR UPDATE TO authenticated
USING (sender_id <> auth.uid() AND public.can_access_order_chat(auth.uid(), order_kind, order_id))
WITH CHECK (sender_id <> auth.uid() AND public.can_access_order_chat(auth.uid(), order_kind, order_id));

CREATE OR REPLACE FUNCTION public.protect_order_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.body := OLD.body;
  NEW.sender_id := OLD.sender_id;
  NEW.order_id := OLD.order_id;
  NEW.order_kind := OLD.order_kind;
  NEW.sender_role := OLD.sender_role;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_protect_order_message BEFORE UPDATE ON public.order_messages
FOR EACH ROW EXECUTE FUNCTION public.protect_order_message();

ALTER TABLE public.order_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_messages;