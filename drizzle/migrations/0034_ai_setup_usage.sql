CREATE TABLE public.ai_setup_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_setup_usage TO authenticated;
GRANT ALL ON public.ai_setup_usage TO service_role;
ALTER TABLE public.ai_setup_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or admin read ai usage" ON public.ai_setup_usage FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX ai_setup_usage_user_day ON public.ai_setup_usage (user_id, created_at DESC);