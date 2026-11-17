CREATE OR REPLACE FUNCTION public.shop_quality_score(_store_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH r AS (SELECT count(*) n, count(*) FILTER (WHERE rating >= 4) pos, coalesce(round(avg(rating)::numeric,1),0) avg FROM public.grocery_reviews WHERE store_id=_store_id),
       o AS (SELECT count(*) FILTER (WHERE status='delivered') d, count(*) FILTER (WHERE status='cancelled') c FROM public.grocery_cart_orders WHERE store_id=_store_id)
  SELECT jsonb_build_object(
    'rating', r.avg, 'reviews', r.n,
    'positive_pct', CASE WHEN r.n>0 THEN round(100.0*r.pos/r.n) END,
    'delivered', o.d,
    'completion_pct', CASE WHEN o.d+o.c>=3 THEN round(100.0*o.d/(o.d+o.c)) END,
    'trusted', (o.d>=10 AND r.n>=5 AND r.avg>=4 AND (o.d+o.c=0 OR 100.0*o.d/(o.d+o.c)>=90)))
  FROM r, o
$$;
CREATE OR REPLACE FUNCTION public.product_rating_breakdown(_product_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT jsonb_build_object('5',count(*) FILTER (WHERE rating=5),'4',count(*) FILTER (WHERE rating=4),'3',count(*) FILTER (WHERE rating=3),'2',count(*) FILTER (WHERE rating=2),'1',count(*) FILTER (WHERE rating=1))
  FROM public.grocery_product_reviews WHERE product_id=_product_id
$$;
REVOKE EXECUTE ON FUNCTION public.shop_quality_score(uuid), public.product_rating_breakdown(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.shop_quality_score(uuid), public.product_rating_breakdown(uuid) TO anon, authenticated;