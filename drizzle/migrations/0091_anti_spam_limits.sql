CREATE OR REPLACE FUNCTION public.enforce_menu_item_cap() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.menu_items WHERE restaurant_id = NEW.restaurant_id) >= 150 THEN
    RAISE EXCEPTION 'ایک ریسٹورنٹ میں زیادہ سے زیادہ 150 ڈشیں ہو سکتی ہیں / Maximum 150 dishes per restaurant';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_menu_item_cap ON public.menu_items;
CREATE TRIGGER trg_menu_item_cap BEFORE INSERT ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.enforce_menu_item_cap();

CREATE OR REPLACE FUNCTION public.enforce_shop_product_cap() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.grocery_products WHERE store_id = NEW.store_id) >= 1000 THEN
    RAISE EXCEPTION 'ایک دکان میں زیادہ سے زیادہ 1000 اشیا ہو سکتی ہیں / Maximum 1000 products per shop';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_shop_product_cap ON public.grocery_products;
CREATE TRIGGER trg_shop_product_cap BEFORE INSERT ON public.grocery_products FOR EACH ROW EXECUTE FUNCTION public.enforce_shop_product_cap();

CREATE OR REPLACE FUNCTION public.enforce_question_limit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.product_questions WHERE asked_by = NEW.asked_by AND store_id = NEW.store_id AND created_at > now() - interval '24 hours') >= 10 THEN
    RAISE EXCEPTION 'ایک دکان سے روزانہ زیادہ سے زیادہ 10 سوال پوچھے جا سکتے ہیں / Maximum 10 questions per shop per day';
  END IF;
  IF (SELECT count(*) FROM public.product_questions WHERE asked_by = NEW.asked_by AND created_at > now() - interval '24 hours') >= 30 THEN
    RAISE EXCEPTION 'آج کے سوالات کی حد پوری ہو گئی، کل دوبارہ پوچھیں / Daily question limit reached';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_question_limit ON public.product_questions;
CREATE TRIGGER trg_question_limit BEFORE INSERT ON public.product_questions FOR EACH ROW EXECUTE FUNCTION public.enforce_question_limit();

CREATE OR REPLACE FUNCTION public.enforce_single_pending_application() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.partner_applications WHERE user_id = NEW.user_id AND status = 'pending') THEN
    RAISE EXCEPTION 'آپ کی ایک درخواست پہلے سے زیرِ غور ہے / You already have a pending application';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_single_pending_application ON public.partner_applications;
CREATE TRIGGER trg_single_pending_application BEFORE INSERT ON public.partner_applications FOR EACH ROW EXECUTE FUNCTION public.enforce_single_pending_application();