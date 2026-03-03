
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  label text,
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage settings" ON public.app_settings FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default helpline settings
INSERT INTO public.app_settings (key, value, label) VALUES
  ('helpline_phone', '03001234567', 'Helpline Phone Number'),
  ('whatsapp_number', '923001234567', 'WhatsApp Number');
