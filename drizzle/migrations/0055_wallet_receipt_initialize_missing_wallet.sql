CREATE OR REPLACE FUNCTION public.submit_wallet_receipt(_user_id uuid,_amount numeric,_account_id uuid,_reference text,_receipt_path text,_sha256 text,_paid_at timestamptz) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE w wallets%ROWTYPE; a payment_accounts%ROWTYPE; tid uuid; flags text[] := '{}'; ref text := upper(trim(_reference));
BEGIN
 IF _user_id IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=_user_id AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Verify your email first'; END IF;
 IF _amount IS NULL OR _amount::text='NaN' OR _amount<10 OR _amount>100000 OR _amount<>round(_amount,2) THEN RAISE EXCEPTION 'Amount must be between 10 and 100000, with at most 2 decimals'; END IF;
 IF ref IS NULL OR ref !~ '^[A-Z0-9][A-Z0-9-]{5,79}$' THEN RAISE EXCEPTION 'Enter a valid transaction reference (6-80 letters or digits)'; END IF;
 IF _receipt_path IS NULL OR _receipt_path !~ ('^'||_user_id::text||'/[a-f0-9-]{36}\.(jpeg|png|webp)$') OR _sha256 IS NULL OR _sha256 !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid receipt'; END IF;
 IF _paid_at IS NULL OR _paid_at>now()+interval '5 minutes' OR _paid_at<now()-interval '30 days' THEN RAISE EXCEPTION 'Payment date must be within the last 30 days'; END IF;
 INSERT INTO wallets(user_id) VALUES(_user_id) ON CONFLICT(user_id) DO NOTHING;
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