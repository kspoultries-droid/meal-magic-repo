CREATE TABLE public.grocery_product_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid NOT NULL,
 product_id uuid NOT NULL,
 store_id uuid NOT NULL,
 customer_id uuid NOT NULL,
 rating int NOT NULL,
 comment text,
 photo_urls text[] NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (order_id, product_id, customer_id)
);
GRANT SELECT ON public.grocery_product_reviews TO authenticated;
GRANT ALL ON public.grocery_product_reviews TO service_role;
ALTER TABLE public.grocery_product_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own product reviews" ON public.grocery_product_reviews FOR SELECT TO authenticated USING (customer_id = auth.uid());
CREATE INDEX idx_gpr_product ON public.grocery_product_reviews(product_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.submit_product_review(_order_id uuid, _product_id uuid, _rating int, _comment text DEFAULT NULL, _photo_urls text[] DEFAULT '{}')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.grocery_cart_orders%ROWTYPE; rid uuid;
BEGIN
 SELECT * INTO o FROM public.grocery_cart_orders WHERE id=_order_id;
 IF auth.uid() IS NULL OR o.customer_id IS DISTINCT FROM auth.uid() OR o.status NOT IN ('delivered','completed') THEN RAISE EXCEPTION 'Only the customer of a delivered order can review'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.grocery_order_items WHERE order_id=_order_id AND (product_id=_product_id OR substitute_product_id=_product_id)) THEN RAISE EXCEPTION 'Item not in this order'; END IF;
 IF _rating NOT BETWEEN 1 AND 5 OR length(coalesce(_comment,''))>500 OR coalesce(array_length(_photo_urls,1),0)>6 THEN RAISE EXCEPTION 'Invalid review'; END IF;
 INSERT INTO public.grocery_product_reviews(order_id,product_id,store_id,customer_id,rating,comment,photo_urls)
 VALUES (_order_id,_product_id,o.store_id,auth.uid(),_rating,nullif(trim(_comment),''),coalesce(_photo_urls,'{}'))
 ON CONFLICT (order_id,product_id,customer_id) DO UPDATE SET rating=EXCLUDED.rating, comment=EXCLUDED.comment, photo_urls=EXCLUDED.photo_urls, updated_at=now()
 RETURNING id INTO rid;
 RETURN rid;
END $$;
REVOKE ALL ON FUNCTION public.submit_product_review(uuid,uuid,int,text,text[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.submit_product_review(uuid,uuid,int,text,text[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.product_public_reviews(_product_id uuid, _limit int DEFAULT 20)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT jsonb_build_object('rating',coalesce(round(avg(r.rating)::numeric,2),0),'count',count(*),
  'reviews',coalesce((SELECT jsonb_agg(x) FROM (SELECT id,rating,comment,photo_urls,created_at FROM public.grocery_product_reviews WHERE product_id=_product_id ORDER BY created_at DESC LIMIT greatest(1,least(_limit,50))) x),'[]'::jsonb))
 FROM public.grocery_product_reviews r WHERE r.product_id=_product_id
$$;
GRANT EXECUTE ON FUNCTION public.product_public_reviews(uuid,int) TO anon, authenticated;