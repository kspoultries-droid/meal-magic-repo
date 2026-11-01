-- Read-only deployed rules; every value must be true. Uses synthetic restaurants
-- via the separate authenticated browser test for actual quote/order execution.
SELECT
 public.food_delivery_block_reason('cb71a10f-3352-4dcd-8a3e-94d0e754bcf0','23f3a7c5-1a64-4a07-9ad9-a640fe444bcf',24.99,67.06) IS NOT NULL AS ryk_to_karachi_rejected,
 public.food_delivery_block_reason('cb71a10f-3352-4dcd-8a3e-94d0e754bcf0','69912746-5dc2-4eab-9d32-fcf5c4f2dabc',28.4339893,70.3073226) IS NOT NULL AS other_city_rejected,
 public.food_delivery_block_reason('cb71a10f-3352-4dcd-8a3e-94d0e754bcf0','23f3a7c5-1a64-4a07-9ad9-a640fe444bcf',NULL,NULL) IS NOT NULL AS missing_pin_rejected,
 public.food_delivery_block_reason('cb71a10f-3352-4dcd-8a3e-94d0e754bcf0','23f3a7c5-1a64-4a07-9ad9-a640fe444bcf',28.44,70.31) IS NULL AS local_ryk_allowed,
 NOT public.delivery_dispatch_ready('food','324eed06-8937-4f56-bc2d-1657d9bd97c0') AS invalid_existing_order_not_dispatched;