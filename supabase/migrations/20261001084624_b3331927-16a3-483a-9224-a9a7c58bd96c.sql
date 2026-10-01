ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS pushed_at timestamptz;

CREATE OR REPLACE FUNCTION public.push_notification_dispatch()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.device_tokens WHERE user_id = NEW.user_id) THEN
    PERFORM net.http_post(
      url := 'https://wczrhmqmpnpwsxhpjhev.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjenJobXFtcG5wd3N4aHBqaGV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNjMwMDIsImV4cCI6MjA4NzYzOTAwMn0.cD57rgmQuDZfTCGk9lS0ad0yslz6VFpQDa-2xdndIu0'),
      body := jsonb_build_object('id', NEW.id)
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW; -- push must never block the in-app notification
END $$;
REVOKE ALL ON FUNCTION public.push_notification_dispatch() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS zz_push_dispatch ON public.notifications;
CREATE TRIGGER zz_push_dispatch AFTER INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.push_notification_dispatch();