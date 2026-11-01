CREATE OR REPLACE FUNCTION public.staff_financial_payload(_table text,_j jsonb) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ DECLARE p jsonb; BEGIN
 IF _table='payouts' THEN p:=jsonb_build_object('operation','payout','vendor_id',_j->>'vendor_id','amount',(_j->>'amount')::numeric,'from_account_id',_j->>'from_account_id','vendor_account_id',_j->>'vendor_account_id','period_start',_j->>'period_start','period_end',_j->>'period_end','reference_no',nullif(trim(_j->>'reference_no'),''),'destination_version',(SELECT md5(jsonb_build_array(account_number,account_title,bank_name,method)::text) FROM vendor_bank_accounts WHERE id=(_j->>'vendor_account_id')::uuid AND user_id=(_j->>'vendor_id')::uuid AND is_active));
 ELSIF _table='rider_salary_payouts' THEN p:=jsonb_build_object('operation','rider_pay','rider_id',_j->>'rider_id','total',(_j->>'total')::numeric,'salary_amount',(_j->>'salary_amount')::numeric,'bonus',(_j->>'bonus')::numeric,'deduction',(_j->>'deduction')::numeric,'order_earnings',(_j->>'order_earnings')::numeric,'period_start',_j->>'period_start','period_end',_j->>'period_end','from_account_id',_j->>'from_account_id','reference_no',nullif(trim(_j->>'reference_no'),''));
 ELSIF _table='refunds' THEN p:=jsonb_build_object('operation','refund','order_id',_j->>'order_id','order_kind',_j->>'order_kind','customer_id',_j->>'customer_id','amount',(_j->>'amount')::numeric,'refund_type',_j->>'refund_type'); ELSE RAISE EXCEPTION 'Unsupported financial operation'; END IF; RETURN p; END $$;
CREATE OR REPLACE FUNCTION public.staff_validate_approval_insert() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE p jsonb:=NEW.payload; BEGIN
 IF p->>'operation'='rider_pay' THEN
 IF p->>'salary_amount' IS NULL OR p->>'bonus' IS NULL OR p->>'deduction' IS NULL OR p->>'order_earnings' IS NULL OR p->>'total' IS NULL OR (p->>'salary_amount')::numeric<0 OR (p->>'bonus')::numeric<0 OR (p->>'deduction')::numeric<0 OR (p->>'order_earnings')::numeric<0 OR (p->>'total')::numeric IS DISTINCT FROM ((p->>'salary_amount')::numeric+(p->>'order_earnings')::numeric+(p->>'bonus')::numeric-(p->>'deduction')::numeric) THEN RAISE EXCEPTION 'Complete nonnegative components and exact total required'; END IF;
 ELSIF p->>'operation'='refund' THEN IF p->>'refund_type' IS NULL OR p->>'refund_type' NOT IN ('full','partial') THEN RAISE EXCEPTION 'Refund type must be full or partial'; END IF;
 END IF; RETURN NEW; END $$;
CREATE TRIGGER staff_validate_exact_request BEFORE INSERT ON public.approval_requests FOR EACH ROW EXECUTE FUNCTION public.staff_validate_approval_insert();
DO $$ DECLARE d text; BEGIN
 SELECT pg_get_functiondef('public.enforce_two_person_approval()'::regprocedure) INTO d;
 IF position('staff_enabled(decided_by)' in d)=0 THEN RAISE EXCEPTION 'Approval anchor missing'; END IF;
 d:=replace(d,'staff_enabled(decided_by)','staff_enabled(decided_by) AND staff_approver_still_allowed(decided_by,k,ref)'); EXECUTE d;
END $$;
CREATE OR REPLACE FUNCTION public.staff_approver_still_allowed(_uid uuid,_kind text,_ref text) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ DECLARE city uuid; BEGIN
 IF NOT staff_enabled(_uid) OR NOT has_permission(_uid,'approve') THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM user_roles WHERE user_id=_uid AND role='admin') OR EXISTS(SELECT 1 FROM staff_controls WHERE user_id=_uid AND nationwide) THEN RETURN true; END IF;
 IF _kind='other' THEN SELECT city_id INTO city FROM riders WHERE id=_ref::uuid;
 ELSIF _kind='payout' THEN RETURN EXISTS(SELECT 1 FROM staff_scopes s WHERE s.user_id=_uid AND (EXISTS(SELECT 1 FROM restaurants r WHERE r.owner_id=_ref::uuid AND r.city_id=s.city_id) OR EXISTS(SELECT 1 FROM grocery_stores g WHERE g.owner_id=_ref::uuid AND g.city_id=s.city_id)));
 ELSE SELECT staff_order_city(order_kind,order_id) INTO city FROM refunds WHERE order_id=_ref::uuid LIMIT 1; IF city IS NULL THEN SELECT city_id INTO city FROM orders WHERE id=_ref::uuid; END IF; IF city IS NULL THEN SELECT city_id INTO city FROM grocery_cart_orders WHERE id=_ref::uuid; END IF; IF city IS NULL THEN SELECT city_id INTO city FROM service_bookings WHERE id=_ref::uuid; END IF; END IF;
 RETURN city IS NOT NULL AND EXISTS(SELECT 1 FROM staff_scopes WHERE user_id=_uid AND city_id=city); EXCEPTION WHEN invalid_text_representation THEN RETURN false; END $$;
CREATE OR REPLACE FUNCTION public.pay_rider(_rider uuid,_period_start date,_period_end date,_salary numeric,_bonus numeric,_deduction numeric,_from_account_id uuid,_reference_no text,_note text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE v_earn numeric; v_total numeric; v_payout uuid; v_bal numeric; v_label text; ids uuid[]; BEGIN
 IF NOT staff_rider_allowed('finance',_rider) OR NOT has_permission(auth.uid(),'finance') THEN RAISE EXCEPTION 'Finance permission or city denied'; END IF;
 IF _period_start IS NULL OR _period_end IS NULL OR _period_end<_period_start OR _salary IS NULL OR _bonus IS NULL OR _deduction IS NULL OR _salary<0 OR _bonus<0 OR _deduction<0 OR _from_account_id IS NULL OR length(trim(coalesce(_note,'')))<3 THEN RAISE EXCEPTION 'Valid period, active account, reason and nonnegative values required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('rider-pay:'||_rider::text,0));
 IF EXISTS(SELECT 1 FROM rider_salary_payouts WHERE rider_id=_rider AND status<>'cancelled' AND period_start<=_period_end AND period_end>=_period_start AND (_salary>0 OR _bonus>0 OR _deduction>0)) THEN RAISE EXCEPTION 'Overlapping salary or adjustment period already paid'; END IF;
 SELECT coalesce(array_agg(e.id),ARRAY[]::uuid[]),coalesce(sum(e.amount),0) INTO ids,v_earn FROM (SELECT id,amount FROM rider_earnings WHERE rider_id=_rider AND status='pending' AND (created_at AT TIME ZONE 'Asia/Karachi')::date BETWEEN _period_start AND _period_end ORDER BY id FOR UPDATE) e;
 v_total:=_salary+v_earn+_bonus-_deduction; IF v_total<=0 THEN RAISE EXCEPTION 'Payment must be positive'; END IF;
 SELECT balance INTO v_bal FROM payment_accounts WHERE id=_from_account_id AND is_active FOR UPDATE;
 IF v_bal IS NULL OR v_bal<v_total THEN RAISE EXCEPTION 'Active account with sufficient balance required'; END IF;
 INSERT INTO rider_salary_payouts(rider_id,period_start,period_end,salary_amount,order_earnings,bonus,deduction,total,from_account_id,reference_no,note,created_by) VALUES(_rider,_period_start,_period_end,_salary,v_earn,_bonus,_deduction,v_total,_from_account_id,_reference_no,_note,auth.uid()) RETURNING id INTO v_payout;
 UPDATE rider_earnings SET status='paid',payout_id=v_payout WHERE id=ANY(ids);
 PERFORM set_config('app.bypass_ledger_guard','on',true);
 UPDATE payment_accounts SET balance=balance-v_total,updated_at=now() WHERE id=_from_account_id RETURNING balance INTO v_bal;
 SELECT full_name INTO v_label FROM profiles WHERE id=_rider;
 INSERT INTO bank_ledger(account_id,direction,amount,balance_after,source_type,source_id,counterparty_id,counterparty_label,reference_no,note,created_by) VALUES(_from_account_id,'out',v_total,v_bal,'rider_salary',v_payout,_rider,coalesce(v_label,'رائیڈر'),_reference_no,_note,auth.uid()); RETURN v_payout; END $$;
DO $$ DECLARE d text; BEGIN SELECT pg_get_functiondef('public.admin_pay_vendor(uuid,numeric,uuid,uuid,date,date,text,text)'::regprocedure) INTO d;
 IF position('IF NOT EXISTS(SELECT 1 FROM vendor_bank_accounts' in d)=0 THEN RAISE EXCEPTION 'Vendor account lock anchor missing'; END IF;
 d:=replace(d,'IF NOT EXISTS(SELECT 1 FROM vendor_bank_accounts WHERE id=_vendor_account_id AND user_id=_vendor_id AND is_active) THEN', 'PERFORM 1 FROM vendor_bank_accounts WHERE id=_vendor_account_id AND user_id=_vendor_id AND is_active FOR SHARE; IF NOT FOUND THEN'); EXECUTE d; END $$;
CREATE OR REPLACE FUNCTION public.staff_request_exact_refund(_kind text,_order uuid,_amount numeric,_type text,_note text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE customer uuid; BEGIN
 IF NOT (staff_order_allowed('support',_kind,_order) OR staff_order_allowed('finance',_kind,_order)) OR _type IS NULL OR _type NOT IN ('full','partial') THEN RAISE EXCEPTION 'Refund scope or type denied'; END IF;
 IF _kind='food' THEN SELECT customer_id INTO customer FROM orders WHERE id=_order; ELSIF _kind='grocery_cart' THEN SELECT customer_id INTO customer FROM grocery_cart_orders WHERE id=_order; ELSIF _kind='grocery_list' THEN SELECT customer_id INTO customer FROM grocery_list_orders WHERE id=_order; ELSIF _kind='service' THEN SELECT customer_id INTO customer FROM service_bookings WHERE id=_order; END IF;
 IF customer IS NULL THEN RAISE EXCEPTION 'Order customer required'; END IF;
 RETURN request_secure_approval('refund',_order,_amount,jsonb_build_object('order_id',_order,'order_kind',_kind,'customer_id',customer,'amount',_amount,'refund_type',_type),_note); END $$;
REVOKE ALL ON FUNCTION public.staff_approver_still_allowed(uuid,text,text),public.staff_validate_approval_insert() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.staff_approver_still_allowed(uuid,text,text) TO authenticated,service_role;