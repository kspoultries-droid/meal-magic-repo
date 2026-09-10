INSERT INTO public.app_settings (key, label, value) VALUES
 ('hero_bazar','Bazar Header Settings','{}'),
 ('hero_services','Services Header Settings','{}')
ON CONFLICT (key) DO NOTHING;

DROP POLICY IF EXISTS "Public safe settings readable" ON public.app_settings;
CREATE POLICY "Public safe settings readable" ON public.app_settings
FOR SELECT USING (
  key = ANY (ARRAY['helpline_phone','whatsapp_number','support_email','support_hours','app_share_url','hero_bazar','hero_services'])
  OR has_role(auth.uid(), 'admin'::app_role)
);