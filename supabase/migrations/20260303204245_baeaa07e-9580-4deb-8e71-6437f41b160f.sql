
-- WebAuthn credentials table for biometric login
CREATE TABLE public.webauthn_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  credential_id text NOT NULL UNIQUE,
  public_key text NOT NULL,
  counter bigint NOT NULL DEFAULT 0,
  device_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.webauthn_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own credentials" ON public.webauthn_credentials
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own credentials" ON public.webauthn_credentials
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own credentials" ON public.webauthn_credentials
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all credentials" ON public.webauthn_credentials
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Service role needs full access for edge functions
CREATE POLICY "Service role full access" ON public.webauthn_credentials
  FOR ALL USING (true) WITH CHECK (true);
