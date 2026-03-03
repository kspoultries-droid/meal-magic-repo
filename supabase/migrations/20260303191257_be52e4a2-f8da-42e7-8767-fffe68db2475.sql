
-- Wallets table for all users
CREATE TABLE public.wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  balance NUMERIC NOT NULL DEFAULT 0,
  total_earned NUMERIC NOT NULL DEFAULT 0,
  total_spent NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage all wallets" ON public.wallets FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Wallet transactions
CREATE TABLE public.wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  type TEXT NOT NULL, -- 'topup', 'payment', 'payout', 'refund', 'commission', 'advance_fee'
  amount NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  reference_id UUID, -- order_id or booking_id
  reference_type TEXT, -- 'order', 'service_booking'
  payment_method TEXT, -- 'jazzcash', 'easypaisa', 'bank', 'cash', 'wallet'
  status TEXT NOT NULL DEFAULT 'completed', -- 'pending', 'completed', 'failed'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own transactions" ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage all transactions" ON public.wallet_transactions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Payout settings per vendor/worker
CREATE TABLE public.payout_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  payout_schedule TEXT NOT NULL DEFAULT 'monthly', -- 'daily', 'weekly', '15days', 'monthly'
  payout_method TEXT NOT NULL DEFAULT 'jazzcash', -- 'jazzcash', 'easypaisa', 'bank', 'cash'
  account_number TEXT,
  account_title TEXT,
  vendor_type TEXT NOT NULL DEFAULT 'grocery', -- 'restaurant', 'grocery', 'labor'
  commission_rate NUMERIC NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payout_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own payout settings" ON public.payout_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own payout settings" ON public.payout_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins manage all payout settings" ON public.payout_settings FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Payout records (when admin pays vendors)
CREATE TABLE public.payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  payout_method TEXT NOT NULL DEFAULT 'jazzcash',
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  notes TEXT,
  processed_by UUID,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors view own payouts" ON public.payouts FOR SELECT USING (auth.uid() = vendor_id);
CREATE POLICY "Admins manage all payouts" ON public.payouts FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add advance_fee column to service_bookings
ALTER TABLE public.service_bookings ADD COLUMN advance_fee NUMERIC DEFAULT 0;
ALTER TABLE public.service_bookings ADD COLUMN advance_paid BOOLEAN DEFAULT false;

-- Auto-create wallet for new users (trigger)
CREATE OR REPLACE FUNCTION public.create_wallet_for_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.wallets (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_wallet_on_profile
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_wallet_for_user();

-- Updated_at triggers
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payout_settings_updated_at BEFORE UPDATE ON public.payout_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
