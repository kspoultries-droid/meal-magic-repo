CREATE OR REPLACE FUNCTION public.guard_shop_question() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.grocery_stores%ROWTYPE;
BEGIN
 SELECT gs.* INTO s FROM public.grocery_products p JOIN public.grocery_stores gs ON gs.id=p.store_id WHERE p.id=NEW.product_id;
 IF s.id IS NULL OR NEW.store_id IS DISTINCT FROM s.id THEN RAISE EXCEPTION 'Invalid product/shop'; END IF;
 IF length(trim(NEW.question)) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Question must be 1-500 characters'; END IF;
 IF TG_OP='INSERT' THEN
  IF auth.uid() IS DISTINCT FROM NEW.asked_by THEN RAISE EXCEPTION 'Not allowed'; END IF;
  NEW.answer:=NULL; NEW.answered_by:=NULL; NEW.answered_at:=NULL;
 ELSE
  NEW.product_id:=OLD.product_id; NEW.store_id:=OLD.store_id; NEW.asked_by:=OLD.asked_by; NEW.created_at:=OLD.created_at;
  IF NEW.answer IS DISTINCT FROM OLD.answer THEN
   IF auth.uid() IS DISTINCT FROM s.owner_id THEN RAISE EXCEPTION 'Only shop owner can answer'; END IF;
   NEW.question:=OLD.question;
   IF length(trim(coalesce(NEW.answer,''))) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'Answer must be 1-2000 characters'; END IF;
   NEW.answered_by:=auth.uid(); NEW.answered_at:=now();
  ELSE NEW.answered_by:=OLD.answered_by; NEW.answered_at:=OLD.answered_at;
   IF NEW.question IS DISTINCT FROM OLD.question AND auth.uid() IS DISTINCT FROM OLD.asked_by THEN RAISE EXCEPTION 'Only author can edit question'; END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_guard_shop_question BEFORE INSERT OR UPDATE ON public.product_questions FOR EACH ROW EXECUTE FUNCTION public.guard_shop_question();
CREATE OR REPLACE FUNCTION public.notify_shop_question() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.grocery_stores%ROWTYPE;
BEGIN
 SELECT * INTO s FROM public.grocery_stores WHERE id=NEW.store_id;
 IF TG_OP='INSERT' THEN PERFORM public.notify_user(s.owner_id,'product_question','پروڈکٹ کا نیا سوال',NEW.question,CASE WHEN s.store_type='wholesale' THEN '/bazar/' ELSE '/grocery/' END||s.id||'?tab=questions');
 ELSIF NEW.answer IS DISTINCT FROM OLD.answer THEN PERFORM public.notify_user(NEW.asked_by,'product_answer','دکاندار کا جواب',NEW.answer,'/product/'||NEW.product_id||'?tab=questions'); END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER zz_notify_shop_question AFTER INSERT OR UPDATE ON public.product_questions FOR EACH ROW EXECUTE FUNCTION public.notify_shop_question();
GRANT SELECT,INSERT,UPDATE ON public.product_questions TO authenticated;
GRANT SELECT ON public.product_questions TO anon;
CREATE OR REPLACE FUNCTION public.guard_verified_shop_review() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.grocery_cart_orders%ROWTYPE;
BEGIN
 IF TG_OP='INSERT' OR NEW.rating IS DISTINCT FROM OLD.rating OR NEW.comment IS DISTINCT FROM OLD.comment OR NEW.photo_urls IS DISTINCT FROM OLD.photo_urls OR NEW.video_url IS DISTINCT FROM OLD.video_url THEN
  SELECT * INTO o FROM public.grocery_cart_orders WHERE id=NEW.order_id;
  IF auth.uid() IS NULL OR o.customer_id IS DISTINCT FROM auth.uid() OR NEW.customer_id IS DISTINCT FROM auth.uid() OR o.store_id IS DISTINCT FROM NEW.store_id OR o.status NOT IN ('delivered','completed') THEN RAISE EXCEPTION 'Only the customer of a delivered order can review'; END IF;
  IF NEW.rating NOT BETWEEN 1 AND 5 OR length(coalesce(NEW.comment,''))>500 THEN RAISE EXCEPTION 'Invalid review'; END IF;
 END IF;
 IF TG_OP='UPDATE' AND (NEW.order_id IS DISTINCT FROM OLD.order_id OR NEW.store_id IS DISTINCT FROM OLD.store_id OR NEW.customer_id IS DISTINCT FROM OLD.customer_id) THEN RAISE EXCEPTION 'Review identity is immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_verified_shop_review BEFORE INSERT OR UPDATE ON public.grocery_reviews FOR EACH ROW EXECUTE FUNCTION public.guard_verified_shop_review();
CREATE OR REPLACE FUNCTION public.refresh_shop_review_rating() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE sid uuid:=coalesce(NEW.store_id,OLD.store_id);
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('shop-rating:'||sid,0));
 UPDATE public.grocery_stores SET rating=coalesce((SELECT round(avg(rating)::numeric,2) FROM public.grocery_reviews WHERE store_id=sid),0) WHERE id=sid;
 RETURN coalesce(NEW,OLD);
END $$;
CREATE TRIGGER zz_refresh_shop_rating AFTER INSERT OR UPDATE OR DELETE ON public.grocery_reviews FOR EACH ROW EXECUTE FUNCTION public.refresh_shop_review_rating();
GRANT SELECT ON public.grocery_reviews_public TO anon,authenticated;
GRANT ALL ON public.grocery_reviews_public TO service_role;
CREATE OR REPLACE FUNCTION public.shop_public_reviews(_store_id uuid,_limit integer DEFAULT 20) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object('rating',coalesce(round(avg(r.rating)::numeric,2),0),'count',count(*),'reviews',coalesce((SELECT jsonb_agg(x) FROM (SELECT id,rating,comment,reply,replied_at,photo_urls,video_url,created_at FROM public.grocery_reviews WHERE store_id=_store_id ORDER BY created_at DESC LIMIT greatest(1,least(_limit,50))) x),'[]'::jsonb)) FROM public.grocery_reviews r WHERE r.store_id=_store_id
$$;
REVOKE ALL ON FUNCTION public.shop_public_reviews(uuid,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.shop_public_reviews(uuid,integer) TO anon,authenticated,service_role;
CREATE INDEX IF NOT EXISTS shop_questions_pending_idx ON public.product_questions(store_id,created_at DESC) WHERE answer IS NULL;
REVOKE ALL ON FUNCTION public.guard_shop_question(), public.notify_shop_question(), public.guard_verified_shop_review(), public.refresh_shop_review_rating() FROM PUBLIC,anon,authenticated;