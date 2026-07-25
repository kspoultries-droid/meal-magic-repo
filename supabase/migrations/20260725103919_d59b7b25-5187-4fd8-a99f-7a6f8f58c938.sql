
CREATE TABLE public.order_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (order_id, customer_id)
);

GRANT SELECT ON public.order_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_reviews TO authenticated;
GRANT ALL ON public.order_reviews TO service_role;

ALTER TABLE public.order_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_reviews_public_read" ON public.order_reviews
  FOR SELECT USING (true);

CREATE POLICY "order_reviews_customer_insert" ON public.order_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    customer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND o.customer_id = auth.uid()
        AND o.status IN ('delivered','completed')
    )
  );

CREATE POLICY "order_reviews_customer_update" ON public.order_reviews
  FOR UPDATE TO authenticated
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "order_reviews_customer_delete" ON public.order_reviews
  FOR DELETE TO authenticated
  USING (customer_id = auth.uid());

CREATE TRIGGER update_order_reviews_updated_at
  BEFORE UPDATE ON public.order_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.recalc_restaurant_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rid UUID;
  _avg NUMERIC;
BEGIN
  _rid := COALESCE(NEW.restaurant_id, OLD.restaurant_id);
  SELECT ROUND(AVG(rating)::numeric, 2) INTO _avg
    FROM public.order_reviews WHERE restaurant_id = _rid;
  UPDATE public.restaurants SET rating = COALESCE(_avg, 0) WHERE id = _rid;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_recalc_rest_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.order_reviews
  FOR EACH ROW EXECUTE FUNCTION public.recalc_restaurant_rating();
