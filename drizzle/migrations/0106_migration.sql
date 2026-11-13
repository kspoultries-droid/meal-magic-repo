CREATE TABLE public.partner_delivery_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'apnahub',
  external_order_no text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  cod boolean NOT NULL DEFAULT true,
  pickup jsonb,
  dropoff jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  rider_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, external_order_no)
);
GRANT SELECT, UPDATE ON public.partner_delivery_jobs TO authenticated;
GRANT ALL ON public.partner_delivery_jobs TO service_role;
ALTER TABLE public.partner_delivery_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read partner jobs" ON public.partner_delivery_jobs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update partner jobs" ON public.partner_delivery_jobs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));