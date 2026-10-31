ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS receipt_path text, ADD COLUMN IF NOT EXISTS receipt_sha256 text, ADD COLUMN IF NOT EXISTS payment_reference text, ADD COLUMN IF NOT EXISTS deposit_account_id uuid REFERENCES public.payment_accounts(id), ADD COLUMN IF NOT EXISTS paid_at timestamptz, ADD COLUMN IF NOT EXISTS risk_flags text[] NOT NULL DEFAULT '{}', ADD COLUMN IF NOT EXISTS review_note text, ADD COLUMN IF NOT EXISTS reviewed_by uuid, ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
CREATE UNIQUE INDEX wallet_topup_receipt_unique ON public.wallet_transactions(receipt_sha256) WHERE type='topup' AND receipt_sha256 IS NOT NULL;
CREATE UNIQUE INDEX wallet_topup_reference_unique ON public.wallet_transactions(deposit_account_id,payment_reference) WHERE type='topup' AND payment_reference IS NOT NULL;
CREATE INDEX wallet_topup_user_status ON public.wallet_transactions(user_id,status,created_at) WHERE type='topup';
CREATE OR REPLACE FUNCTION public.request_wallet_topup(_amount numeric,_payment_method text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN RAISE EXCEPTION 'Attach receipt and transaction reference using the updated wallet form'; END $$;
CREATE OR REPLACE FUNCTION public.wallet_deposit_accounts() RETURNS TABLE(id uuid,label text,method text,bank_name text,account_title text,account_number text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT id,label,method,bank_name,account_title,account_number FROM payment_accounts WHERE auth.uid() IS NOT NULL AND is_active AND method IN ('jazzcash','easypaisa','bank') AND length(trim(account_number))>0 AND length(trim(account_title))>0 $$;
REVOKE ALL ON FUNCTION public.wallet_deposit_accounts() FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.wallet_deposit_accounts() TO authenticated;
CREATE OR REPLACE FUNCTION public.submit_wallet_receipt(_user_id uuid,_amount numeric,_account_id uuid,_reference text,_receipt_path text,_sha256 text,_paid_at timestamptz) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE w wallets%ROWTYPE; a payment_accounts%ROWTYPE; tid uuid; flags text[] := '{}'; ref text := upper(trim(_reference));
BEGIN
 IF _user_id IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=_user_id AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Verify your email first'; END IF;
 IF _amount IS NULL OR _amount::text='NaN' OR _amount<10 OR _amount>100000 OR _amount<>round(_amount,2) THEN RAISE EXCEPTION 'Amount must be between 10 and 100000, with at most 2 decimals'; END IF;
 IF ref IS NULL OR ref !~ '^[A-Z0-9][A-Z0-9-]{5,79}$' THEN RAISE EXCEPTION 'Enter a valid transaction reference (6-80 letters or digits)'; END IF;
 IF _receipt_path IS NULL OR _receipt_path !~ ('^'||_user_id::text||'/[a-f0-9-]{36}\.(jpeg|png|webp)$') OR _sha256 IS NULL OR _sha256 !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid receipt'; END IF;
 IF _paid_at IS NULL OR _paid_at>now()+interval '5 minutes' OR _paid_at<now()-interval '30 days' THEN RAISE EXCEPTION 'Payment date must be within the last 30 days'; END IF;
 SELECT * INTO w FROM wallets WHERE user_id=_user_id FOR UPDATE; IF w.id IS NULL THEN RAISE EXCEPTION 'Wallet not found'; END IF;
 IF EXISTS(SELECT 1 FROM wallet_transactions WHERE user_id=_user_id AND type='topup' AND status='pending') THEN RAISE EXCEPTION 'A request is already pending; wait for its review'; END IF;
 IF (SELECT count(*) FROM wallet_transactions WHERE user_id=_user_id AND type='topup' AND created_at>now()-interval '24 hours')>=3 THEN RAISE EXCEPTION 'Maximum 3 requests in 24 hours'; END IF;
 IF EXISTS(SELECT 1 FROM wallet_transactions WHERE user_id=_user_id AND type='topup' AND created_at>now()-interval '1 minute') THEN RAISE EXCEPTION 'Wait 1 minute before another request'; END IF;
 SELECT * INTO a FROM payment_accounts WHERE id=_account_id AND is_active AND method IN ('jazzcash','easypaisa','bank') AND length(trim(account_number))>0 AND length(trim(account_title))>0; IF a.id IS NULL THEN RAISE EXCEPTION 'Choose an active company deposit account'; END IF;
 IF EXISTS(SELECT 1 FROM wallet_transactions WHERE type='topup' AND (receipt_sha256=_sha256 OR (deposit_account_id=_account_id AND payment_reference=ref))) THEN RAISE EXCEPTION 'This receipt or reference has already been submitted'; END IF;
 IF _amount>=50000 THEN flags:=array_append(flags,'high_amount'); END IF; IF _paid_at<now()-interval '48 hours' THEN flags:=array_append(flags,'older_payment'); END IF;
 INSERT INTO wallet_transactions(wallet_id,user_id,type,amount,balance_after,description,payment_method,status,receipt_path,receipt_sha256,payment_reference,deposit_account_id,paid_at,risk_flags) VALUES(w.id,_user_id,'topup',_amount,w.balance,'Wallet deposit awaiting bank confirmation',a.method,'pending',_receipt_path,_sha256,ref,_account_id,_paid_at,flags) RETURNING id INTO tid; RETURN tid;
END $$;
REVOKE ALL ON FUNCTION public.submit_wallet_receipt(uuid,numeric,uuid,text,text,text,timestamptz) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.submit_wallet_receipt(uuid,numeric,uuid,text,text,text,timestamptz) TO service_role;
CREATE OR REPLACE FUNCTION public.review_wallet_topup(_id uuid,_approve boolean,_note text,_confirmed_reference text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE tx wallet_transactions%ROWTYPE; wb numeric; ab numeric;
BEGIN
 IF auth.uid() IS NULL OR NOT has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin access required'; END IF;
 IF _approve IS NULL OR _note IS NULL OR length(trim(_note))<5 OR length(_note)>1000 THEN RAISE EXCEPTION 'Review reason required (5-1000 characters)'; END IF;
 SELECT * INTO tx FROM wallet_transactions WHERE id=_id AND type='topup' FOR UPDATE; IF tx.id IS NULL OR tx.status<>'pending' THEN RAISE EXCEPTION 'Request is not pending'; END IF;
 IF _approve THEN
  IF tx.receipt_path IS NULL OR tx.deposit_account_id IS NULL OR tx.payment_reference IS NULL THEN RAISE EXCEPTION 'Old request has no evidence; reject and ask for a new receipt'; END IF;
  IF upper(trim(coalesce(_confirmed_reference,'')))<>tx.payment_reference THEN RAISE EXCEPTION 'Enter the matching reference confirmed in the company bank statement'; END IF;
  PERFORM set_config('app.bypass_ledger_guard','on',true);
  UPDATE payment_accounts SET balance=balance+tx.amount WHERE id=tx.deposit_account_id RETURNING balance INTO ab;
  UPDATE wallets SET balance=balance+tx.amount,updated_at=now() WHERE id=tx.wallet_id RETURNING balance INTO wb;
  INSERT INTO bank_ledger(account_id,direction,amount,balance_after,source_type,source_id,counterparty_id,reference_no,note,created_by) VALUES(tx.deposit_account_id,'in',tx.amount,ab,'wallet_topup',tx.id,tx.user_id,tx.payment_reference,trim(_note),auth.uid());
  PERFORM post_ledger_txn('wallet_topup','wallet',tx.id,jsonb_build_array(jsonb_build_object('account','bank_cash','direction','debit','amount',tx.amount),jsonb_build_object('account','customer_wallet_payable','direction','credit','amount',tx.amount,'party',tx.user_id)),trim(_note));
  UPDATE wallet_transactions SET status='completed',balance_after=wb,review_note=trim(_note),reviewed_by=auth.uid(),reviewed_at=now() WHERE id=tx.id;
 ELSE UPDATE wallet_transactions SET status='rejected',review_note=trim(_note),reviewed_by=auth.uid(),reviewed_at=now() WHERE id=tx.id;
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.review_wallet_topup(uuid,boolean,text,text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.review_wallet_topup(uuid,boolean,text,text) TO authenticated;
CREATE POLICY "Wallet receipt authorized reads" ON storage.objects FOR SELECT TO authenticated USING(bucket_id='wallet-receipts' AND EXISTS(SELECT 1 FROM public.wallet_transactions t WHERE t.receipt_path=storage.objects.name AND (t.user_id=auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE OR REPLACE FUNCTION public.admin_create_own_business(_kind text,_name text,_city_id uuid,_address text,_phone text,_category_id uuid DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); bid uuid;
BEGIN
 IF uid IS NULL OR NOT has_role(uid,'admin') THEN RAISE EXCEPTION 'Admin access required'; END IF;
 IF _kind IS NULL OR _kind NOT IN ('restaurant','grocery','wholesale','service_provider') THEN RAISE EXCEPTION 'Invalid business type'; END IF;
 IF _name IS NULL OR length(trim(_name))<2 OR length(_name)>150 OR _address IS NULL OR length(trim(_address))<8 OR length(_address)>500 OR _phone IS NULL OR _phone !~ '^\+?[0-9]{10,15}$' THEN RAISE EXCEPTION 'Valid name, address and phone required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM cities WHERE id=_city_id AND is_active) THEN RAISE EXCEPTION 'Choose an active city'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(uid::text||':own-business'));
 IF _kind='restaurant' THEN
  INSERT INTO user_roles(user_id,role) VALUES(uid,'restaurant_owner') ON CONFLICT DO NOTHING;
  INSERT INTO restaurants(owner_id,name,city_id,pickup_address,is_active) VALUES(uid,trim(_name),_city_id,trim(_address),false) RETURNING id INTO bid;
 ELSIF _kind IN ('grocery','wholesale') THEN
  INSERT INTO grocery_stores(owner_id,name,city_id,store_type,is_active) VALUES(uid,trim(_name),_city_id,CASE WHEN _kind='wholesale' THEN 'wholesale' ELSE 'retail' END,false) RETURNING id INTO bid;
 ELSE
  IF NOT EXISTS(SELECT 1 FROM service_categories WHERE id=_category_id AND is_active) THEN RAISE EXCEPTION 'Choose an active service category'; END IF;
  IF EXISTS(SELECT 1 FROM service_providers WHERE user_id=uid) THEN RAISE EXCEPTION 'Your service provider profile already exists; open My services'; END IF;
  INSERT INTO user_roles(user_id,role) VALUES(uid,'mechanic') ON CONFLICT DO NOTHING;
  INSERT INTO service_providers(user_id,name,city_id,category_id,address,phone,is_active,is_available) VALUES(uid,trim(_name),_city_id,_category_id,trim(_address),_phone,true,false) RETURNING id INTO bid;
 END IF;
 RETURN bid;
END $$;
REVOKE ALL ON FUNCTION public.admin_create_own_business(text,text,uuid,text,text,uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.admin_create_own_business(text,text,uuid,text,text,uuid) TO authenticated;