
-- Service reviews/feedback table
CREATE TABLE public.service_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.service_bookings(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.service_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers create own reviews" ON public.service_reviews
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Anyone can view reviews" ON public.service_reviews
  FOR SELECT USING (true);

CREATE POLICY "Admins manage reviews" ON public.service_reviews
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Unique constraint: one review per booking
CREATE UNIQUE INDEX idx_service_reviews_booking ON public.service_reviews(booking_id);
