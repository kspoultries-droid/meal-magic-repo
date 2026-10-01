-- ===== Permissions =====
CREATE OR REPLACE FUNCTION public.role_permissions(_role public.app_role)
RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _role::text
    WHEN 'admin' THEN ARRAY['orders','dispatch','riders','partners','finance','approve','support','content','settings','team','audit']
    WHEN 'ops_manager' THEN ARRAY['orders','dispatch','riders','partners','support','audit']
    WHEN 'dispatcher' THEN ARRAY['orders','dispatch']
    WHEN 'support' THEN ARRAY['orders','support']
    WHEN 'finance' THEN ARRAY['orders','finance','approve']
    WHEN 'partner_manager' THEN ARRAY['partners']
    WHEN 'rider_supervisor' THEN ARRAY['riders']
    ELSE ARRAY[]::text[] END
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _perm text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = _user_id AND _perm = ANY(public.role_permissions(ur.role)))
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = _user_id
    AND ur.role::text IN ('admin','support','ops_manager','dispatcher','finance','partner_manager','rider_supervisor'))
$$;

CREATE OR REPLACE FUNCTION public.my_permissions()
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(array_agg(DISTINCT p), ARRAY[]::text[])
  FROM public.user_roles ur, unnest(public.role_permissions(ur.role)) p
  WHERE ur.user_id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.has_permission(uuid,text), public.is_staff(uuid), public.my_permissions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid,text), public.is_staff(uuid), public.my_permissions() TO authenticated, service_role;

-- ===== Staff city scopes =====
CREATE TABLE public.staff_scopes (
  user_id uuid NOT NULL,
  city_id uuid NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, city_id)
);
GRANT SELECT ON public.staff_scopes TO authenticated;
GRANT ALL ON public.staff_scopes TO service_role;
ALTER TABLE public.staff_scopes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or team read scopes" ON public.staff_scopes FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_permission(auth.uid(),'team'));

-- ===== Staff read access to operational data =====
CREATE POLICY "staff orders read" ON public.orders FOR SELECT TO authenticated USING (public.has_permission(auth.uid(),'orders'));
CREATE POLICY "staff grocery orders read" ON public.grocery_cart_orders FOR SELECT TO authenticated USING (public.has_permission(auth.uid(),'orders'));
CREATE POLICY "staff offers read" ON public.delivery_offers FOR SELECT TO authenticated USING (public.has_permission(auth.uid(),'dispatch'));
CREATE POLICY "staff riders read" ON public.riders FOR SELECT TO authenticated USING (public.has_permission(auth.uid(),'riders') OR public.has_permission(auth.uid(),'dispatch'));
CREATE POLICY "staff riders update" ON public.riders FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(),'riders')) WITH CHECK (public.has_permission(auth.uid(),'riders'));
CREATE POLICY "staff partner apps read" ON public.partner_applications FOR SELECT TO authenticated USING (public.has_permission(auth.uid(),'partners'));
CREATE POLICY "staff restaurants update" ON public.restaurants FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(),'partners')) WITH CHECK (public.has_permission(auth.uid(),'partners'));
CREATE POLICY "staff stores update" ON public.grocery_stores FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(),'partners')) WITH CHECK (public.has_permission(auth.uid(),'partners'));
CREATE POLICY "staff payouts read" ON public.payouts FOR SELECT TO authenticated USING (public.has_permission(auth.uid(),'finance'));
CREATE POLICY "staff remittances read" ON public.rider_remittances FOR SELECT TO authenticated USING (public.has_permission(auth.uid(),'finance'));
CREATE POLICY "staff refunds read" ON public.refunds FOR SELECT TO authenticated USING (public.has_permission(auth.uid(),'finance') OR public.has_permission(auth.uid(),'support'));

-- ===== Append-only staff audit log =====
CREATE TABLE public.staff_audit_log (
  id bigserial PRIMARY KEY,
  actor_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX staff_audit_log_actor_idx ON public.staff_audit_log(actor_id, created_at DESC);
CREATE INDEX staff_audit_log_created_idx ON public.staff_audit_log(created_at DESC);
GRANT SELECT ON public.staff_audit_log TO authenticated;
GRANT ALL ON public.staff_audit_log TO service_role;
ALTER TABLE public.staff_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit readers" ON public.staff_audit_log FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(),'audit'));

CREATE OR REPLACE FUNCTION public.audit_staff_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _old jsonb; _new jsonb; _diff jsonb := '{}'::jsonb; k text;
BEGIN
  IF _uid IS NULL OR NOT public.is_staff(_uid) THEN RETURN COALESCE(NEW, OLD); END IF;
  _old := CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) ELSE '{}'::jsonb END;
  _new := CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) ELSE '{}'::jsonb END;
  IF TG_OP = 'UPDATE' THEN
    FOR k IN SELECT jsonb_object_keys(_new) LOOP
      IF k NOT IN ('updated_at','last_seen_at','current_lat','current_lng') AND (_old->k) IS DISTINCT FROM (_new->k) THEN
        _diff := _diff || jsonb_build_object(k, jsonb_build_object('from', _old->k, 'to', _new->k));
      END IF;
    END LOOP;
    IF _diff = '{}'::jsonb THEN RETURN NEW; END IF;
  ELSE
    _diff := CASE WHEN TG_OP='INSERT' THEN _new ELSE _old END;
  END IF;
  INSERT INTO public.staff_audit_log(actor_id, action, entity_type, entity_id, details)
  VALUES (_uid, lower(TG_OP), TG_TABLE_NAME, COALESCE(_new->>'id', _old->>'id', _new->>'user_id', _old->>'user_id'), _diff);
  RETURN COALESCE(NEW, OLD);
END $$;
REVOKE ALL ON FUNCTION public.audit_staff_change() FROM PUBLIC, anon, authenticated;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['user_roles','payouts','refunds','riders','restaurants','grocery_stores','rider_remittances','orders','grocery_cart_orders','partner_applications','staff_scopes'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS zz_audit_staff ON public.%I', t);
    EXECUTE format('CREATE TRIGGER zz_audit_staff AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_staff_change()', t);
  END LOOP;
END $$;

-- ===== Team management RPCs =====
CREATE OR REPLACE FUNCTION public.list_staff()
RETURNS TABLE(user_id uuid, email text, full_name text, roles text[], city_ids uuid[], last_action_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_permission(auth.uid(),'team') THEN RAISE EXCEPTION 'not allowed'; END IF;
  RETURN QUERY
  SELECT u.id, u.email::text, p.full_name,
    array_agg(DISTINCT ur.role::text),
    COALESCE((SELECT array_agg(s.city_id) FROM public.staff_scopes s WHERE s.user_id = u.id), ARRAY[]::uuid[]),
    (SELECT max(a.created_at) FROM public.staff_audit_log a WHERE a.actor_id = u.id)
  FROM public.user_roles ur
  JOIN auth.users u ON u.id = ur.user_id
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE ur.role::text IN ('admin','support','ops_manager','dispatcher','finance','partner_manager','rider_supervisor')
  GROUP BY u.id, u.email, p.full_name;
END $$;

CREATE OR REPLACE FUNCTION public.staff_add(_email text, _role public.app_role, _city_ids uuid[] DEFAULT '{}')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid; _owner boolean;
BEGIN
  IF NOT public.has_permission(auth.uid(),'team') THEN RAISE EXCEPTION 'not allowed'; END IF;
  IF _role::text NOT IN ('admin','support','ops_manager','dispatcher','finance','partner_manager','rider_supervisor') THEN RAISE EXCEPTION 'not a staff role'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.app_owner WHERE user_id = auth.uid()) INTO _owner;
  IF _role = 'admin' AND NOT _owner THEN RAISE EXCEPTION 'only owner can add admins'; END IF;
  SELECT id INTO _uid FROM auth.users WHERE lower(email) = lower(trim(_email));
  IF _uid IS NULL THEN RAISE EXCEPTION 'user not found — ask them to sign up first'; END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (_uid, _role) ON CONFLICT DO NOTHING;
  IF _city_ids IS NOT NULL AND array_length(_city_ids,1) > 0 THEN
    DELETE FROM public.staff_scopes WHERE user_id = _uid;
    INSERT INTO public.staff_scopes(user_id, city_id) SELECT _uid, unnest(_city_ids) ON CONFLICT DO NOTHING;
  END IF;
  RETURN _uid;
END $$;

CREATE OR REPLACE FUNCTION public.staff_remove(_user_id uuid, _role public.app_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _owner boolean;
BEGIN
  IF NOT public.has_permission(auth.uid(),'team') THEN RAISE EXCEPTION 'not allowed'; END IF;
  IF EXISTS(SELECT 1 FROM public.app_owner WHERE user_id = _user_id) THEN RAISE EXCEPTION 'owner is protected'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.app_owner WHERE user_id = auth.uid()) INTO _owner;
  IF _role = 'admin' AND NOT _owner THEN RAISE EXCEPTION 'only owner can remove admins'; END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id AND role = _role;
  IF NOT public.is_staff(_user_id) THEN DELETE FROM public.staff_scopes WHERE user_id = _user_id; END IF;
END $$;

REVOKE ALL ON FUNCTION public.list_staff(), public.staff_add(text, public.app_role, uuid[]), public.staff_remove(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_staff(), public.staff_add(text, public.app_role, uuid[]), public.staff_remove(uuid, public.app_role) TO authenticated, service_role;

-- ===== Two-person approvals =====
CREATE TABLE public.approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('refund','payout','other')),
  amount numeric(14,2) NOT NULL DEFAULT 0,
  reference_id text,
  note text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  requested_by uuid NOT NULL,
  decided_by uuid,
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);
CREATE INDEX approval_requests_status_idx ON public.approval_requests(status, created_at DESC);
GRANT SELECT ON public.approval_requests TO authenticated;
GRANT ALL ON public.approval_requests TO service_role;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approvals read" ON public.approval_requests FOR SELECT TO authenticated
  USING (requested_by = auth.uid() OR public.has_permission(auth.uid(),'approve'));

CREATE OR REPLACE FUNCTION public.request_approval(_kind text, _amount numeric, _reference_id text, _note text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'not allowed'; END IF;
  IF _amount IS NULL OR _amount < 0 THEN RAISE EXCEPTION 'invalid amount'; END IF;
  INSERT INTO public.approval_requests(kind, amount, reference_id, note, requested_by)
  VALUES (_kind, _amount, left(_reference_id,100), left(_note,500), auth.uid()) RETURNING id INTO _id;
  INSERT INTO public.staff_audit_log(actor_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'request', 'approval_requests', _id::text, jsonb_build_object('kind',_kind,'amount',_amount,'reference',_reference_id));
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.decide_approval(_id uuid, _approve boolean, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _r public.approval_requests;
BEGIN
  IF NOT public.has_permission(auth.uid(),'approve') THEN RAISE EXCEPTION 'not allowed'; END IF;
  SELECT * INTO _r FROM public.approval_requests WHERE id = _id FOR UPDATE;
  IF NOT FOUND OR _r.status <> 'pending' THEN RAISE EXCEPTION 'request not pending'; END IF;
  IF _r.requested_by = auth.uid() THEN RAISE EXCEPTION 'requester cannot approve own request'; END IF;
  UPDATE public.approval_requests SET status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
    decided_by = auth.uid(), decision_note = left(_note,500), decided_at = now() WHERE id = _id;
  INSERT INTO public.staff_audit_log(actor_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), CASE WHEN _approve THEN 'approve' ELSE 'reject' END, 'approval_requests', _id::text, jsonb_build_object('amount',_r.amount,'kind',_r.kind));
END $$;
REVOKE ALL ON FUNCTION public.request_approval(text,numeric,text,text), public.decide_approval(uuid,boolean,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_approval(text,numeric,text,text), public.decide_approval(uuid,boolean,text) TO authenticated, service_role;

-- ===== Team performance =====
CREATE OR REPLACE FUNCTION public.team_performance(_days int DEFAULT 7)
RETURNS TABLE(actor_id uuid, email text, full_name text, total_actions bigint, order_actions bigint, rider_actions bigint, finance_actions bigint, approvals bigint, last_action_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_permission(auth.uid(),'team') THEN RAISE EXCEPTION 'not allowed'; END IF;
  RETURN QUERY
  SELECT a.actor_id, u.email::text, p.full_name, count(*),
    count(*) FILTER (WHERE a.entity_type IN ('orders','grocery_cart_orders')),
    count(*) FILTER (WHERE a.entity_type IN ('riders','delivery_offers')),
    count(*) FILTER (WHERE a.entity_type IN ('payouts','refunds','rider_remittances')),
    count(*) FILTER (WHERE a.entity_type = 'approval_requests' AND a.action IN ('approve','reject')),
    max(a.created_at)
  FROM public.staff_audit_log a
  LEFT JOIN auth.users u ON u.id = a.actor_id
  LEFT JOIN public.profiles p ON p.id = a.actor_id
  WHERE a.created_at >= now() - make_interval(days => GREATEST(1, LEAST(_days, 365)))
  GROUP BY a.actor_id, u.email, p.full_name
  ORDER BY count(*) DESC;
END $$;
REVOKE ALL ON FUNCTION public.team_performance(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.team_performance(int) TO authenticated, service_role;

-- ===== In-app notifications =====
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text,
  path text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications(user_id, created_at DESC);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications read" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own notifications update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own notifications delete" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

CREATE OR REPLACE FUNCTION public.notify_user(_user uuid, _kind text, _title text, _body text, _path text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _user IS NULL THEN RETURN; END IF;
  INSERT INTO public.notifications(user_id, kind, title, body, path) VALUES (_user, _kind, _title, _body, _path);
END $$;
REVOKE ALL ON FUNCTION public.notify_user(uuid,text,text,text,text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_order_events()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _owner uuid; _label text; _short text := left(NEW.id::text, 8); _path text;
BEGIN
  IF TG_TABLE_NAME = 'orders' THEN
    SELECT owner_id INTO _owner FROM public.restaurants WHERE id = NEW.restaurant_id;
    _path := '/order-tracking/' || NEW.id;
  ELSE
    SELECT owner_id INTO _owner FROM public.grocery_stores WHERE id = NEW.store_id;
    _path := '/order-tracking/' || NEW.id || '?type=grocery';
  END IF;

  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify_user(_owner, 'new_order', 'نیا آرڈر آیا! #' || _short, 'Rs ' || NEW.total_amount || ' — فوراً قبول کریں', NULL);
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    _label := CASE NEW.status
      WHEN 'confirmed' THEN 'آپ کا آرڈر قبول ہو گیا'
      WHEN 'preparing' THEN 'آپ کا آرڈر تیار ہو رہا ہے'
      WHEN 'picking' THEN 'آپ کا سامان اکٹھا ہو رہا ہے'
      WHEN 'ready' THEN 'آرڈر تیار ہے، رائیڈر آ رہا ہے'
      WHEN 'ready_for_pickup' THEN 'آرڈر تیار ہے، رائیڈر آ رہا ہے'
      WHEN 'delivering' THEN 'رائیڈر آپ کے پاس آ رہا ہے'
      WHEN 'out_for_delivery' THEN 'رائیڈر آپ کے پاس آ رہا ہے'
      WHEN 'delivered' THEN 'آرڈر ڈلیور ہو گیا — شکریہ!'
      WHEN 'cancelled' THEN 'آرڈر منسوخ ہو گیا'
      ELSE NULL END;
    IF _label IS NOT NULL THEN
      PERFORM public.notify_user(NEW.customer_id, 'order_status', _label, 'آرڈر #' || _short, _path);
    END IF;
  END IF;

  IF NEW.rider_id IS DISTINCT FROM OLD.rider_id AND NEW.rider_id IS NOT NULL THEN
    PERFORM public.notify_user(NEW.rider_id, 'assigned', 'آرڈر آپ کو مل گیا #' || _short, 'پک اپ کے لیے روانہ ہوں', '/rider');
    PERFORM public.notify_user(_owner, 'rider_assigned', 'رائیڈر مل گیا #' || _short, NULL, NULL);
  END IF;

  IF NEW.dispatch_state IS DISTINCT FROM OLD.dispatch_state AND NEW.dispatch_state = 'stuck' THEN
    INSERT INTO public.notifications(user_id, kind, title, body, path)
    SELECT DISTINCT ur.user_id, 'stuck', 'پھنسا ہوا آرڈر #' || _short, 'کوئی رائیڈر نہیں ملا — ہاتھ سے لگائیں', '/admin'
    FROM public.user_roles ur WHERE 'dispatch' = ANY(public.role_permissions(ur.role));
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notify_order_events() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS zz_notify_order ON public.orders;
CREATE TRIGGER zz_notify_order AFTER INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.notify_order_events();
DROP TRIGGER IF EXISTS zz_notify_order ON public.grocery_cart_orders;
CREATE TRIGGER zz_notify_order AFTER INSERT OR UPDATE ON public.grocery_cart_orders FOR EACH ROW EXECUTE FUNCTION public.notify_order_events();

CREATE OR REPLACE FUNCTION public.notify_offer_events()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'pending' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.notify_user(NEW.rider_id, 'offer', 'نئی ڈلیوری آفر!', COALESCE(NEW.pickup_name,'') || ' — Rs ' || COALESCE(NEW.delivery_fee,0), '/rider');
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notify_offer_events() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS zz_notify_offer ON public.delivery_offers;
CREATE TRIGGER zz_notify_offer AFTER INSERT OR UPDATE ON public.delivery_offers FOR EACH ROW EXECUTE FUNCTION public.notify_offer_events();

CREATE OR REPLACE FUNCTION public.notify_approval_events()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications(user_id, kind, title, body, path)
    SELECT DISTINCT ur.user_id, 'approval', 'منظوری درکار: Rs ' || NEW.amount, NEW.kind || COALESCE(' — ' || NEW.note,''), '/admin'
    FROM public.user_roles ur WHERE 'approve' = ANY(public.role_permissions(ur.role)) AND ur.user_id <> NEW.requested_by;
  ELSIF NEW.status <> OLD.status THEN
    PERFORM public.notify_user(NEW.requested_by, 'approval', CASE WHEN NEW.status='approved' THEN 'درخواست منظور' ELSE 'درخواست مسترد' END, 'Rs ' || NEW.amount, '/admin');
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notify_approval_events() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER zz_notify_approval AFTER INSERT OR UPDATE ON public.approval_requests FOR EACH ROW EXECUTE FUNCTION public.notify_approval_events();