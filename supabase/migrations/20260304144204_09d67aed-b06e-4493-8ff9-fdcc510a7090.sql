
-- Create a secure RPC function for wallet topup requests
CREATE OR REPLACE FUNCTION public.request_wallet_topup(
  _amount numeric,
  _payment_method text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _wallet_id uuid;
  _wallet_balance numeric;
  _txn_id uuid;
BEGIN
  -- Validate authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate amount (server-side)
  IF _amount IS NULL OR _amount < 10 OR _amount > 100000 THEN
    RAISE EXCEPTION 'Amount must be between 10 and 100000';
  END IF;

  -- Validate payment method
  IF _payment_method NOT IN ('jazzcash', 'easypaisa', 'bank', 'cash') THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;

  -- Get user's wallet
  SELECT id, balance INTO _wallet_id, _wallet_balance
  FROM public.wallets
  WHERE user_id = auth.uid();

  IF _wallet_id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;

  -- Insert transaction with server-controlled fields
  INSERT INTO public.wallet_transactions (
    wallet_id, user_id, type, amount, balance_after,
    description, payment_method, status
  ) VALUES (
    _wallet_id, auth.uid(), 'topup', _amount, _wallet_balance,
    'Top-up via ' || _payment_method, _payment_method, 'pending'
  ) RETURNING id INTO _txn_id;

  RETURN _txn_id;
END;
$$;
