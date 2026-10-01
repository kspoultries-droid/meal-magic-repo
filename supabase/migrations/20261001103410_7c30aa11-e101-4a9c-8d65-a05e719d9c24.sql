CREATE TABLE public.webauthn_challenges (challenge text PRIMARY KEY, kind text NOT NULL, user_id uuid, expires_at timestamptz NOT NULL DEFAULT now() + interval '5 minutes');
GRANT ALL ON public.webauthn_challenges TO service_role;
ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;