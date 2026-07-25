-- Normalize any legacy statuses to new workflow
UPDATE public.orders SET status = 'confirmed'  WHERE status = 'accepted';
UPDATE public.orders SET status = 'preparing'  WHERE status = 'ready';
UPDATE public.orders SET status = 'delivering' WHERE status = 'picked_up';

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status = ANY (ARRAY['pending','confirmed','preparing','delivering','delivered','completed','cancelled']));