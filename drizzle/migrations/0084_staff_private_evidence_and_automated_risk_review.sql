CREATE OR REPLACE FUNCTION public.staff_authorize_evidence(_bucket text,_path text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE city uuid; ref text; allowed boolean:=false; n integer; BEGIN
 IF NOT staff_enabled(auth.uid()) THEN RAISE EXCEPTION 'Staff access revoked'; END IF;
 IF _bucket='partner-documents' THEN RETURN staff_authorize_private_document(_path);
 ELSIF _bucket='service-evidence' THEN SELECT b.city_id,b.id::text,can_supervise_service(b.id) INTO city,ref,allowed FROM service_bookings b WHERE b.final_bill_path=_path LIMIT 1;
 ELSIF _bucket='delivery-proofs' THEN SELECT o.city_id,o.id::text,staff_order_allowed('support','food',o.id) INTO city,ref,allowed FROM orders o WHERE o.delivery_proof_path=_path LIMIT 1;
 ELSIF _bucket='payout-receipts' THEN SELECT p.id::text,staff_vendor_allowed(p.vendor_id) INTO ref,allowed FROM payouts p WHERE p.receipt_path=_path LIMIT 1; SELECT r.city_id INTO city FROM payouts p JOIN restaurants r ON r.owner_id=p.vendor_id WHERE p.id::text=ref LIMIT 1;
 ELSIF _bucket='wallet-receipts' THEN SELECT t.id::text,has_role(auth.uid(),'admin') INTO ref,allowed FROM wallet_transactions t WHERE t.receipt_path=_path LIMIT 1;
 ELSE RAISE EXCEPTION 'Unsupported evidence bucket'; END IF;
 IF ref IS NULL OR NOT coalesce(allowed,false) THEN RAISE EXCEPTION 'Evidence outside authorized record'; END IF;
 INSERT INTO staff_private_access(actor_id,entity_id,city_id) VALUES(auth.uid(),_bucket||':'||ref,city);
 INSERT INTO staff_audit_log(actor_id,action,entity_type,entity_id,city_id,details) VALUES(auth.uid(),'private_read',_bucket,ref,city,jsonb_build_object('private_access',true)); RETURN true; END $$;
ALTER POLICY "Riders view own delivery proofs" ON storage.objects USING(bucket_id='delivery-proofs' AND split_part(name,'/',1)=auth.uid()::text);
ALTER POLICY "service evidence participant read" ON storage.objects USING(bucket_id='service-evidence' AND EXISTS(SELECT 1 FROM service_bookings b WHERE b.id::text=split_part(name,'/',2) AND (b.customer_id=auth.uid() OR mechanic_can_access_booking(auth.uid(),b.id))));
ALTER POLICY "category supervisors read service evidence" ON storage.objects USING(false);
ALTER POLICY "Payout participants view receipts" ON storage.objects USING(bucket_id='payout-receipts' AND EXISTS(SELECT 1 FROM payouts p WHERE p.vendor_id=auth.uid() AND p.receipt_path=name));
ALTER POLICY "Finance read scoped vendor receipts" ON storage.objects USING(false);
ALTER POLICY "Wallet receipt authorized reads" ON storage.objects USING(bucket_id='wallet-receipts' AND EXISTS(SELECT 1 FROM wallet_transactions t WHERE t.user_id=auth.uid() AND t.receipt_path=name));
CREATE OR REPLACE FUNCTION public.staff_log_report_access(_report text,_count integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NOT staff_enabled(auth.uid()) OR _count<0 OR _count>100000 OR NOT ((_report='team' AND has_permission(auth.uid(),'team')) OR (_report='revenue' AND has_permission(auth.uid(),'finance'))) THEN RAISE EXCEPTION 'Report permission denied'; END IF;
 INSERT INTO staff_audit_log(actor_id,action,entity_type,entity_id,details) VALUES(auth.uid(),'export','staff_report',_report,jsonb_build_object('rows',_count)); END $$;
CREATE TABLE public.staff_monitor_runs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),started_at timestamptz NOT NULL DEFAULT now(),finished_at timestamptz,status text NOT NULL DEFAULT 'running',created_cases integer DEFAULT 0,error_code text);
GRANT SELECT ON public.staff_monitor_runs TO authenticated; GRANT ALL ON public.staff_monitor_runs TO service_role;
ALTER TABLE public.staff_monitor_runs ENABLE ROW LEVEL SECURITY; CREATE POLICY "Owner monitor health" ON public.staff_monitor_runs FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM app_owner WHERE user_id=auth.uid()));
CREATE INDEX staff_monitor_runs_time ON public.staff_monitor_runs(started_at DESC);
CREATE OR REPLACE FUNCTION public.staff_run_supervision() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE runid uuid; n integer:=0; added integer; ownerid uuid; BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('staff-supervision-monitor',0));
 INSERT INTO staff_monitor_runs DEFAULT VALUES RETURNING id INTO runid; SELECT user_id INTO ownerid FROM app_owner LIMIT 1;
 BEGIN
 n:=staff_escalate_cases();
 INSERT INTO staff_cases(source_kind,source_id,department,title,next_action)
 SELECT 'refund_pattern',r.customer_id::text||':'||to_char(now() AT TIME ZONE 'Asia/Karachi','YYYY-MM-DD'),'finance','متعدد رقم واپسیاں؛ آزاد جائزہ','اصل ادائیگی، شکایت اور صارف کی وضاحت ملا کر جانچیں؛ خودکار الزام نہیں' FROM refunds r WHERE r.created_at>now()-interval '24 hours' AND r.status NOT IN ('failed','rejected') GROUP BY r.customer_id HAVING count(*)>=3 ON CONFLICT(source_kind,source_id) DO NOTHING; GET DIAGNOSTICS added=ROW_COUNT; n:=n+added;
 INSERT INTO staff_cases(source_kind,source_id,department,title,next_action)
 SELECT 'cancellation_pattern',a.actor_id::text||':'||to_char(now() AT TIME ZONE 'Asia/Karachi','YYYY-MM-DD'),'support','مسلسل منسوخیاں؛ وجہ کی جانچ','گاہک، دکان اور عملے کی ضرورت الگ جانچیں؛ تعداد جرم یا ناقص کارکردگی کا ثبوت نہیں' FROM staff_audit_log a WHERE a.created_at>now()-interval '24 hours' AND a.actor_id IS NOT NULL AND a.entity_type IN ('orders','grocery_cart_orders','grocery_list_orders','service_bookings') AND (a.details->'new'->>'status'='cancelled' OR a.details->>'status'='cancelled') GROUP BY a.actor_id HAVING count(DISTINCT a.entity_id)>=5 ON CONFLICT(source_kind,source_id) DO NOTHING; GET DIAGNOSTICS added=ROW_COUNT; n:=n+added;
 INSERT INTO staff_cases(source_kind,source_id,department,title,next_action)
 SELECT 'evidence_pattern',a.actor_id::text||':'||to_char(now() AT TIME ZONE 'Asia/Karachi','YYYY-MM-DD-HH24'),'partners','نجی ثبوت کی کثرت؛ آزاد جائزہ','کام کے بوجھ اور مجاز ضرورت کی جانچ؛ خودکار الزام نہیں' FROM staff_private_access a WHERE a.created_at>now()-interval '1 hour' GROUP BY a.actor_id HAVING count(*)>=50 ON CONFLICT(source_kind,source_id) DO NOTHING; GET DIAGNOSTICS added=ROW_COUNT; n:=n+added;
 IF n>0 THEN PERFORM notify_user(ownerid,'staff_monitor','ٹیم نگرانی میں نئے معاملات',n::text||' معاملات یا تاخیر؛ آزاد جائزہ درکار','/admin'); END IF;
 UPDATE staff_monitor_runs SET finished_at=now(),status='ok',created_cases=n WHERE id=runid;
 EXCEPTION WHEN OTHERS THEN UPDATE staff_monitor_runs SET finished_at=now(),status='failed',error_code=SQLSTATE WHERE id=runid; PERFORM notify_user(ownerid,'staff_monitor_failed','ٹیم نگرانی کی جانچ نامکمل','خودکار جانچ دوبارہ چلانے اور خرابی دیکھنے کی ضرورت ہے','/admin'); END;
 RETURN n; END $$;
CREATE OR REPLACE FUNCTION public.staff_monitor_health() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ BEGIN IF NOT EXISTS(SELECT 1 FROM app_owner WHERE user_id=auth.uid()) THEN RAISE EXCEPTION 'Owner only'; END IF; RETURN coalesce((SELECT to_jsonb(r) FROM staff_monitor_runs r ORDER BY started_at DESC LIMIT 1),'{}'::jsonb); END $$;
CREATE OR REPLACE FUNCTION public.staff_run_monitor_now() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF NOT EXISTS(SELECT 1 FROM app_owner WHERE user_id=auth.uid()) THEN RAISE EXCEPTION 'Owner only'; END IF; RETURN staff_run_supervision(); END $$;
DO $$ DECLARE jid bigint; BEGIN SELECT jobid INTO jid FROM cron.job WHERE jobname='staff-case-hourly-escalation'; IF jid IS NOT NULL THEN PERFORM cron.alter_job(jid,command:='SELECT public.staff_run_supervision()'); END IF; END $$;
REVOKE ALL ON FUNCTION public.staff_authorize_evidence(text,text),public.staff_log_report_access(text,integer),public.staff_run_supervision(),public.staff_monitor_health(),public.staff_run_monitor_now() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.staff_authorize_evidence(text,text),public.staff_log_report_access(text,integer),public.staff_monitor_health(),public.staff_run_monitor_now() TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.staff_run_supervision() TO service_role;
CREATE INDEX IF NOT EXISTS staff_audit_risk_time ON public.staff_audit_log(entity_type,created_at,actor_id);
CREATE INDEX IF NOT EXISTS staff_refund_customer_time ON public.refunds(customer_id,created_at);