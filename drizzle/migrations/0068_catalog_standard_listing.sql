ALTER TABLE public.catalog_items
  ADD COLUMN IF NOT EXISTS name_ur text,
  ADD COLUMN IF NOT EXISTS barcode text,
  ADD COLUMN IF NOT EXISTS specs jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS image_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS catalog_items_barcode_uniq ON public.catalog_items (barcode) WHERE barcode IS NOT NULL AND barcode <> '';
ALTER TABLE public.grocery_products ADD COLUMN IF NOT EXISTS catalog_item_id uuid;
CREATE INDEX IF NOT EXISTS grocery_products_catalog_item_idx ON public.grocery_products (catalog_item_id);