ALTER TABLE public.rider_remittances
  ADD CONSTRAINT rider_remittances_receipt_own_path
  CHECK (receipt_url IS NULL OR (receipt_url LIKE rider_id::text || '/remittance-%' AND position('..' in receipt_url) = 0 AND position('/' in substr(receipt_url, length(rider_id::text) + 2)) = 0)) NOT VALID;
