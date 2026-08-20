CREATE OR REPLACE FUNCTION public.get_top_selling_grocery_products(_limit integer DEFAULT 12)
RETURNS TABLE (
  id uuid,
  name text,
  price numeric,
  discount_price numeric,
  image_url text,
  unit text,
  store_id uuid,
  sold_qty numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH sold AS (
    SELECT
      COALESCE(NULLIF(it->>'product_id',''), NULLIF(it->>'id','')) AS pid,
      SUM(COALESCE((it->>'quantity')::numeric, 1)) AS qty
    FROM public.grocery_cart_orders o
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(o.items) = 'array' THEN o.items ELSE '[]'::jsonb END
    ) AS it
    WHERE o.created_at > now() - interval '90 days'
    GROUP BY 1
  )
  SELECT p.id, p.name, p.price, p.discount_price, p.image_url, p.unit, p.store_id, s.qty
  FROM sold s
  JOIN public.grocery_products p ON p.id::text = s.pid
  WHERE p.is_available IS DISTINCT FROM false
  ORDER BY s.qty DESC
  LIMIT GREATEST(1, LEAST(_limit, 30));
$$;

REVOKE ALL ON FUNCTION public.get_top_selling_grocery_products(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_top_selling_grocery_products(integer) TO anon, authenticated, service_role;