CREATE OR REPLACE FUNCTION public.staff_city_allowed(_city uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT auth.uid() IS NOT NULL AND public.is_staff(auth.uid()) AND (public.has_role(auth.uid(),'admin') OR NOT EXISTS(SELECT 1 FROM public.staff_scopes WHERE user_id=auth.uid()) OR EXISTS(SELECT 1 FROM public.staff_scopes WHERE user_id=auth.uid() AND city_id=_city)) $$;
CREATE OR REPLACE FUNCTION public.staff_order_city(_kind text,_id uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT city_id FROM (SELECT o.city_id FROM public.orders o WHERE _kind='food' AND o.id=_id UNION ALL SELECT coalesce(o.city_id,s.city_id) FROM public.grocery_cart_orders o JOIN public.grocery_stores s ON s.id=o.store_id WHERE _kind='grocery_cart' AND o.id=_id UNION ALL SELECT s.city_id FROM public.grocery_list_orders o JOIN public.grocery_stores s ON s.id=o.store_id WHERE _kind='grocery_list' AND o.id=_id UNION ALL SELECT b.city_id FROM public.service_bookings b WHERE _kind='service' AND b.id=_id) x LIMIT 1 $$;
CREATE OR REPLACE FUNCTION public.staff_order_allowed(_perm text,_kind text,_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT public.has_permission(auth.uid(),_perm) AND public.staff_city_allowed(public.staff_order_city(_kind,_id)) $$;
CREATE OR REPLACE FUNCTION public.staff_rider_allowed(_perm text,_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT public.has_permission(auth.uid(),_perm) AND EXISTS(SELECT 1 FROM public.riders r WHERE r.id=_id AND public.staff_city_allowed(r.city_id)) $$;
CREATE OR REPLACE FUNCTION public.staff_vendor_allowed(_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT public.has_permission(auth.uid(),'finance') AND (public.has_role(auth.uid(),'admin') OR NOT EXISTS(SELECT 1 FROM public.staff_scopes WHERE user_id=auth.uid()) OR (EXISTS(SELECT 1 FROM public.restaurants r WHERE r.owner_id=_id UNION ALL SELECT 1 FROM public.grocery_stores s WHERE s.owner_id=_id UNION ALL SELECT 1 FROM public.service_providers p WHERE p.user_id=_id) AND NOT EXISTS(SELECT 1 FROM (SELECT city_id FROM public.restaurants WHERE owner_id=_id UNION ALL SELECT city_id FROM public.grocery_stores WHERE owner_id=_id UNION ALL SELECT city_id FROM public.service_providers WHERE user_id=_id) v WHERE NOT public.staff_city_allowed(v.city_id)))) $$;
CREATE OR REPLACE FUNCTION public.staff_application_allowed(_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.partner_applications a WHERE a.id=_id AND public.staff_city_allowed(a.city_id) AND public.has_permission(auth.uid(),CASE WHEN a.applicant_type='rider' THEN 'riders' ELSE 'partners' END)) $$;
REVOKE ALL ON FUNCTION public.staff_city_allowed(uuid),public.staff_order_city(text,uuid),public.staff_order_allowed(text,text,uuid),public.staff_rider_allowed(text,uuid),public.staff_vendor_allowed(uuid),public.staff_application_allowed(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.staff_city_allowed(uuid),public.staff_order_city(text,uuid),public.staff_order_allowed(text,text,uuid),public.staff_rider_allowed(text,uuid),public.staff_vendor_allowed(uuid),public.staff_application_allowed(uuid) TO authenticated,service_role;
DO $$ DECLARE p record; q text; w text; scope text; perm text; BEGIN
FOR p IN SELECT * FROM pg_policies WHERE schemaname='public' AND tablename IN ('orders','grocery_cart_orders','grocery_list_orders','delivery_offers','riders','partner_applications','restaurants','grocery_stores','payouts','rider_remittances','refunds','payment_accounts','bank_ledger','platform_commissions','commission_rules','rider_cash_journal','rider_earnings','rider_verifications','order_items','grocery_order_items','service_bookings','support_tickets') LOOP
 q:=p.qual; w:=p.with_check;
 scope:=CASE p.tablename
 WHEN 'orders' THEN 'public.staff_city_allowed(city_id)'
 WHEN 'grocery_cart_orders' THEN 'public.staff_city_allowed(coalesce(city_id,(select city_id from public.grocery_stores where id=store_id)))'
 WHEN 'grocery_list_orders' THEN 'public.staff_city_allowed((select city_id from public.grocery_stores where id=store_id))'
 WHEN 'delivery_offers' THEN 'public.staff_city_allowed(public.staff_order_city(order_kind,order_id))'
 WHEN 'riders' THEN 'public.staff_city_allowed(city_id)'
 WHEN 'partner_applications' THEN 'public.staff_application_allowed(id)'
 WHEN 'restaurants' THEN 'public.staff_city_allowed(city_id)'
 WHEN 'grocery_stores' THEN 'public.staff_city_allowed(city_id)'
 WHEN 'payouts' THEN 'public.staff_vendor_allowed(vendor_id)'
 WHEN 'rider_remittances' THEN 'public.staff_rider_allowed(''finance'',rider_id)'
 WHEN 'refunds' THEN 'public.staff_city_allowed(public.staff_order_city(order_kind,order_id))'
 WHEN 'platform_commissions' THEN 'public.staff_city_allowed(city_id)'
 WHEN 'rider_cash_journal' THEN 'public.staff_rider_allowed(''finance'',rider_id)'
 WHEN 'rider_earnings' THEN 'public.staff_rider_allowed(''finance'',rider_id)'
 WHEN 'rider_verifications' THEN 'public.staff_city_allowed((select city_id from public.partner_applications where id=application_id))'
 WHEN 'order_items' THEN 'public.staff_order_allowed(''orders'',''food'',order_id)'
 WHEN 'grocery_order_items' THEN 'public.staff_order_allowed(''orders'',''grocery_cart'',order_id)'
 WHEN 'service_bookings' THEN 'public.staff_city_allowed(city_id)' ELSE 'true' END;
 perm:=CASE WHEN p.tablename IN ('payment_accounts','bank_ledger','platform_commissions','commission_rules','rider_cash_journal','rider_earnings','rider_remittances','payouts') THEN 'finance' WHEN p.tablename IN ('partner_applications','restaurants','grocery_stores') THEN 'partners' WHEN p.tablename IN ('riders','rider_verifications') THEN 'riders' WHEN p.tablename='support_tickets' THEN 'support' ELSE 'orders' END;
 IF p.cmd='UPDATE' AND p.tablename IN ('orders','grocery_list_orders') AND coalesce(q,'') LIKE '%has_role(auth.uid(), ''support''%' THEN EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,p.tablename); CONTINUE; END IF;
 IF coalesce(q,'') LIKE '%has_permission%' THEN q:='('||q||') AND ('||scope||')'; END IF;
 IF coalesce(w,'') LIKE '%has_permission%' THEN w:='('||w||') AND ('||scope||')'; END IF;
 q:=replace(q,'has_role(auth.uid(), ''support''::app_role)','(public.has_permission(auth.uid(),'||quote_literal(perm)||') AND ('||scope||'))');
 w:=replace(w,'has_role(auth.uid(), ''support''::app_role)','(public.has_permission(auth.uid(),'||quote_literal(perm)||') AND ('||scope||'))');
 IF p.tablename='support_tickets' THEN
  q:=replace(q,'is_staff(auth.uid())','(public.has_permission(auth.uid(),''support'') AND public.staff_city_allowed(public.staff_order_city(order_kind,coalesce(service_booking_id,order_id))))');
  w:=replace(w,'is_staff(auth.uid())','(public.has_permission(auth.uid(),''support'') AND public.staff_city_allowed(public.staff_order_city(order_kind,coalesce(service_booking_id,order_id))))');
 END IF;
 IF q IS DISTINCT FROM p.qual OR w IS DISTINCT FROM p.with_check THEN EXECUTE format('ALTER POLICY %I ON public.%I%s%s',p.policyname,p.tablename,CASE WHEN q IS NOT NULL THEN ' USING ('||q||')' ELSE '' END,CASE WHEN w IS NOT NULL THEN ' WITH CHECK ('||w||')' ELSE '' END); END IF;
END LOOP; END $$;
DROP POLICY IF EXISTS "Support view all profiles" ON public.profiles;
CREATE POLICY "Scoped staff related profiles" ON public.profiles FOR SELECT TO authenticated USING (
 ((public.has_permission(auth.uid(),'riders') OR public.has_permission(auth.uid(),'dispatch') OR public.has_permission(auth.uid(),'finance')) AND EXISTS(SELECT 1 FROM public.riders r WHERE r.id=profiles.id AND public.staff_city_allowed(r.city_id)))
 OR (public.has_permission(auth.uid(),'orders') AND (EXISTS(SELECT 1 FROM public.orders o WHERE o.customer_id=profiles.id AND public.staff_city_allowed(o.city_id)) OR EXISTS(SELECT 1 FROM public.grocery_cart_orders o WHERE o.customer_id=profiles.id AND public.staff_city_allowed(o.city_id)) OR EXISTS(SELECT 1 FROM public.service_bookings b WHERE b.customer_id=profiles.id AND public.staff_city_allowed(b.city_id))))
 OR (public.has_permission(auth.uid(),'partners') AND EXISTS(SELECT 1 FROM public.partner_applications a WHERE a.user_id=profiles.id AND public.staff_application_allowed(a.id))) OR public.staff_vendor_allowed(profiles.id));
CREATE POLICY "Scoped staff rider roles" ON public.user_roles FOR SELECT TO authenticated USING(role='rider' AND (public.staff_rider_allowed('riders',user_id) OR public.staff_rider_allowed('dispatch',user_id) OR public.staff_rider_allowed('finance',user_id)));
CREATE POLICY "Scoped staff list orders" ON public.grocery_list_orders FOR SELECT TO authenticated USING(public.staff_order_allowed('orders','grocery_list',id));
CREATE POLICY "Scoped support service bookings" ON public.service_bookings FOR SELECT TO authenticated USING(public.has_permission(auth.uid(),'support') AND public.staff_city_allowed(city_id));
CREATE POLICY "Scoped staff application reviews" ON public.partner_applications FOR SELECT TO authenticated USING(public.staff_application_allowed(id));
CREATE POLICY "Finance reads vendor accounts" ON public.vendor_bank_accounts FOR SELECT TO authenticated USING(public.staff_vendor_allowed(user_id));
CREATE POLICY "Finance reads vendor payout settings" ON public.payout_settings FOR SELECT TO authenticated USING(public.staff_vendor_allowed(user_id));
CREATE POLICY "Finance reads applicable rider plans" ON public.rider_pay_plans FOR SELECT TO authenticated USING(public.has_permission(auth.uid(),'finance') AND ((rider_id IS NOT NULL AND public.staff_rider_allowed('finance',rider_id)) OR (rider_id IS NULL AND (city_id IS NULL OR public.staff_city_allowed(city_id)))));
CREATE POLICY "Finance reads rider salary payouts" ON public.rider_salary_payouts FOR SELECT TO authenticated USING(public.staff_rider_allowed('finance',rider_id));