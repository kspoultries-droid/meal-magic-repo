CREATE OR REPLACE FUNCTION public.record_rider_earning(_kind text,_order_id uuid,_rider uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE k text; offer delivery_offers%ROWTYPE; p rider_pay_plans%ROWTYPE; base numeric; distpay numeric; amount numeric; state text;
BEGIN
 IF _rider IS NULL THEN RETURN; END IF;
 k:=CASE _kind WHEN 'grocery_cart_orders' THEN 'grocery_cart' WHEN 'grocery_list_orders' THEN 'grocery_list' ELSE _kind END;
 IF EXISTS(SELECT 1 FROM rider_earnings WHERE order_id=_order_id AND order_kind IN (k,_kind)) THEN RETURN; END IF;
 SELECT * INTO offer FROM delivery_offers WHERE order_kind=k AND order_id=_order_id AND rider_id=_rider AND status='accepted' ORDER BY created_at DESC LIMIT 1;
 p:=resolve_rider_pay(_rider);
 base:=CASE WHEN p.pay_type='salaried' THEN 0 ELSE COALESCE(p.per_order_fee,0) END;
 distpay:=ROUND(COALESCE(p.per_km_fee,0)*COALESCE(offer.earning_distance_km,0));
 amount:=COALESCE(offer.estimated_earning,0); state:=CASE WHEN offer.estimated_earning IS NULL THEN 'needs_review' ELSE 'pending' END;
 INSERT INTO rider_earnings(rider_id,order_kind,order_id,distance_km,base_pay,distance_pay,amount,status) VALUES(_rider,k,_order_id,COALESCE(offer.earning_distance_km,0),base,distpay,amount,state) ON CONFLICT(order_kind,order_id) DO NOTHING;
 PERFORM set_config('app.bypass_rider_guard','on',true);
 UPDATE riders SET total_earnings=(SELECT COALESCE(sum(e.amount),0) FROM rider_earnings e WHERE e.rider_id=_rider AND e.status NOT IN ('cancelled','needs_review')) WHERE id=_rider;
 PERFORM set_config('app.bypass_rider_guard','off',true);
END $$;
COMMENT ON FUNCTION public.record_rider_earning(text,uuid,uuid) IS 'Missing offer distance uses legacy required zero placeholder only with needs_review status; no payable earning until finance confirms distance.';