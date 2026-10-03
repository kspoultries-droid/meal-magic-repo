CREATE OR REPLACE FUNCTION public.notify_ticket_reply() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status = 'resolved' AND OLD.status <> 'resolved' THEN
    PERFORM public.notify_user(NEW.user_id, 'support', 'شکایت کا جواب', left(COALESCE(NEW.staff_reply,'آپ کی شکایت حل ہو گئی'),200),
      CASE WHEN NEW.order_id IS NOT NULL THEN '/order-tracking/' || NEW.order_id ELSE '/profile' END);
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notify_ticket_reply() FROM public, anon, authenticated;
CREATE TRIGGER trg_notify_ticket_reply AFTER UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.notify_ticket_reply();