
ALTER TABLE public.grocery_stores 
  ADD COLUMN IF NOT EXISTS monthly_fee numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active' CHECK (subscription_status IN ('active', 'warned', 'paused')),
  ADD COLUMN IF NOT EXISTS warning_message text,
  ADD COLUMN IF NOT EXISTS fee_paid_until date;
