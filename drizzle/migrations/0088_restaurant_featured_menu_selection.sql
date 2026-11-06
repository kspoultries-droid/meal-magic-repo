ALTER TABLE public.restaurants ADD COLUMN featured_menu_item_ids uuid[] NOT NULL DEFAULT '{}';
CREATE OR REPLACE FUNCTION public.validate_featured_menu_selection() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF cardinality(NEW.featured_menu_item_ids)>4 THEN RAISE EXCEPTION 'زیادہ سے زیادہ 4 مرکزی ڈشیں منتخب کریں'; END IF;
 IF EXISTS (SELECT 1 FROM unnest(NEW.featured_menu_item_ids) x WHERE NOT EXISTS (SELECT 1 FROM public.menu_items m WHERE m.id=x AND m.restaurant_id=NEW.id)) THEN RAISE EXCEPTION 'مرکزی ڈش اسی ریسٹورنٹ کے مینو سے منتخب کریں'; END IF;
 IF cardinality(NEW.featured_menu_item_ids)<>(SELECT count(DISTINCT x) FROM unnest(NEW.featured_menu_item_ids) x) THEN RAISE EXCEPTION 'ایک ڈش دوبارہ منتخب نہیں ہو سکتی'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER validate_featured_menu_selection BEFORE INSERT OR UPDATE OF featured_menu_item_ids ON public.restaurants FOR EACH ROW EXECUTE FUNCTION public.validate_featured_menu_selection();