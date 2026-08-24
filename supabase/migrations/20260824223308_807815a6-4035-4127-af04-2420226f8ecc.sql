CREATE TABLE public.reel_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reel_id uuid NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL DEFAULT auth.uid(),
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reel_id, reporter_id)
);

GRANT SELECT, INSERT ON public.reel_reports TO authenticated;
GRANT UPDATE, DELETE ON public.reel_reports TO authenticated;
GRANT ALL ON public.reel_reports TO service_role;

ALTER TABLE public.reel_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can report reels"
ON public.reel_reports FOR INSERT TO authenticated
WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Users can view own reports"
ON public.reel_reports FOR SELECT TO authenticated
USING (reporter_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update reports"
ON public.reel_reports FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete reports"
ON public.reel_reports FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_reel_reports_reel ON public.reel_reports(reel_id);
CREATE INDEX idx_reel_reports_status ON public.reel_reports(status);

CREATE TRIGGER update_reel_reports_updated_at
BEFORE UPDATE ON public.reel_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();