CREATE TRIGGER trg_stamp_list_lifecycle BEFORE INSERT OR UPDATE OF status ON public.grocery_list_orders FOR EACH ROW EXECUTE FUNCTION public.stamp_order_lifecycle();
CREATE OR REPLACE FUNCTION public.stamp_order_lifecycle() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.status IN ('confirmed','preparing') AND NEW.accepted_at IS NULL THEN NEW.accepted_at:=now(); END IF;
 IF (NEW.status IN ('ready','ready_for_pickup') OR (TG_TABLE_NAME='orders' AND NEW.status='delivering' AND NEW.picked_up_at IS NULL)) AND NEW.ready_at IS NULL THEN NEW.ready_at:=now(); END IF;
 IF NEW.status IN ('delivered','completed') AND NEW.delivered_at IS NULL THEN NEW.delivered_at:=now(); END IF;
 IF NEW.status='cancelled' AND NEW.cancelled_at IS NULL THEN NEW.cancelled_at:=now(); END IF;
 RETURN NEW;
END $$;
DO $$ DECLARE def text; BEGIN
 SELECT pg_get_functiondef(oid) INTO def FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname='record_rider_earning';
 def:=replace(def,'PERFORM set_config(''app.bypass_rider_guard'',''on'',true);','IF state=''pending'' AND amount>0 THEN PERFORM public.post_ledger_txn(''rider_earning'',k,_order_id,jsonb_build_array(jsonb_build_object(''account'',''rider_pay_expense'',''party'',_rider::text,''direction'',''debit'',''amount'',amount),jsonb_build_object(''account'',''rider_payable'',''party'',_rider::text,''direction'',''credit'',''amount'',amount)),''Confirmed rider delivery earning''); END IF; PERFORM set_config(''app.bypass_rider_guard'',''on'',true);');
 EXECUTE def;
END $$;
COMMENT ON FUNCTION public.stamp_order_lifecycle() IS 'Kitchen readiness timestamp is distinct from physical pickup; photo-list orders use the same timing markers as cart orders.';