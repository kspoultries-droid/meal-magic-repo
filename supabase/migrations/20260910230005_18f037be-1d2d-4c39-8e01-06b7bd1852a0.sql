ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS busy_until timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS prep_minutes integer;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_proof_path text;