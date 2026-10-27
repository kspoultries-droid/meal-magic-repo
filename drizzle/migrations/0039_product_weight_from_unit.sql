CREATE OR REPLACE FUNCTION public.parse_weight_kg(_txt text)
RETURNS numeric LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE m text[]; v numeric; u text;
BEGIN
  IF _txt IS NULL THEN RETURN NULL; END IF;
  m := regexp_match(lower(_txt), '(\d+(?:\.\d+)?)\s*(kg|kgs|kilo|کلو|gm|gms|grams?|g|گرام|ml|ltr|litre|liter|l|لیٹر)(?![a-z])');
  IF m IS NULL THEN RETURN NULL; END IF;
  v := m[1]::numeric; u := m[2];
  IF u IN ('gm','gms','gram','grams','g','گرام','ml') THEN v := v / 1000; END IF;
  IF v <= 0 OR v > 2000 THEN RETURN NULL; END IF;
  RETURN round(v, 3);
END $$;

CREATE OR REPLACE FUNCTION public.grocery_product_weight_fill()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE p numeric;
BEGIN
  p := COALESCE(public.parse_weight_kg(NEW.unit), public.parse_weight_kg(NEW.weight), public.parse_weight_kg(NEW.name));
  IF p IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.weight_kg IS NULL OR NEW.weight_kg = 0.5 THEN NEW.weight_kg := p; END IF;
  ELSIF NEW.weight_kg IS NOT DISTINCT FROM OLD.weight_kg AND (OLD.weight_kg IS NULL OR OLD.weight_kg = 0.5) THEN
    NEW.weight_kg := p;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_grocery_product_weight_fill ON public.grocery_products;
CREATE TRIGGER trg_grocery_product_weight_fill BEFORE INSERT OR UPDATE ON public.grocery_products
FOR EACH ROW EXECUTE FUNCTION public.grocery_product_weight_fill();

UPDATE public.grocery_products
SET weight_kg = COALESCE(public.parse_weight_kg(unit), public.parse_weight_kg(weight), public.parse_weight_kg(name))
WHERE (weight_kg IS NULL OR weight_kg = 0.5)
  AND COALESCE(public.parse_weight_kg(unit), public.parse_weight_kg(weight), public.parse_weight_kg(name)) IS NOT NULL;