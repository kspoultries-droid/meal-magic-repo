CREATE TABLE IF NOT EXISTS public.internal_secrets (name text PRIMARY KEY, value text NOT NULL);
REVOKE ALL ON public.internal_secrets FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.internal_secrets TO service_role;
ALTER TABLE public.internal_secrets ENABLE ROW LEVEL SECURITY;
INSERT INTO public.internal_secrets(name, value)
VALUES ('push_dispatch', encode(extensions.gen_random_bytes(32), 'hex'))
ON CONFLICT (name) DO NOTHING;

CREATE OR REPLACE FUNCTION public.push_notification_dispatch()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE s text;
BEGIN
  IF EXISTS (SELECT 1 FROM public.device_tokens WHERE user_id = NEW.user_id) THEN
    SELECT value INTO s FROM public.internal_secrets WHERE name = 'push_dispatch';
    PERFORM net.http_post(
      url := 'https://wczrhmqmpnpwsxhpjhev.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object('Content-Type','application/json','x-push-secret', s),
      body := jsonb_build_object('id', NEW.id)
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.push_notification_dispatch() FROM PUBLIC, anon, authenticated;