CREATE TABLE public.product_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.grocery_products(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.grocery_stores(id) ON DELETE CASCADE,
  asked_by uuid NOT NULL,
  question text NOT NULL,
  answer text,
  answered_by uuid,
  answered_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.product_questions TO anon;
GRANT SELECT, INSERT, UPDATE ON public.product_questions TO authenticated;
GRANT ALL ON public.product_questions TO service_role;

ALTER TABLE public.product_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view product questions"
  ON public.product_questions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Customers can ask product questions"
  ON public.product_questions FOR INSERT
  TO authenticated
  WITH CHECK (asked_by = auth.uid());

CREATE POLICY "Customers can update their unanswered questions"
  ON public.product_questions FOR UPDATE
  TO authenticated
  USING (asked_by = auth.uid() AND answer IS NULL)
  WITH CHECK (asked_by = auth.uid() AND answer IS NULL);

CREATE POLICY "Store owners can answer product questions"
  ON public.product_questions FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.grocery_stores
    WHERE grocery_stores.id = product_questions.store_id
      AND grocery_stores.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.grocery_stores
    WHERE grocery_stores.id = product_questions.store_id
      AND grocery_stores.owner_id = auth.uid()
  ));

CREATE TRIGGER update_product_questions_updated_at
  BEFORE UPDATE ON public.product_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();