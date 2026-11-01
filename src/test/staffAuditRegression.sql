-- Read-only regressions against the deployed shared audit predicate.
-- Every result must be true; meaningful changes must never be suppressed.
SELECT
 public.staff_audit_business_details('riders','update','{"location_updated_at":{"from":"old","to":"new"},"location_accuracy_m":{"from":7,"to":8}}'::jsonb)='{}'::jsonb AS gps_only_excluded,
 public.staff_audit_business_details('riders','update','{"last_seen_at":{},"current_lat":{},"current_lng":{}}'::jsonb)='{}'::jsonb AS presence_only_excluded,
 public.staff_audit_business_details('riders','update','{"is_available":{"from":false,"to":true}}'::jsonb) ? 'is_available' AS availability_preserved,
 public.staff_audit_business_details('riders','update','{"location_updated_at":{},"is_suspended":{"from":false,"to":true}}'::jsonb)='{"is_suspended":{"from":false,"to":true}}'::jsonb AS mixed_preserved,
 public.staff_audit_business_details('riders','insert','{"location_updated_at":"new"}'::jsonb) ? 'location_updated_at' AS insert_preserved,
 public.staff_audit_business_details('orders','update','{"location_updated_at":{}}'::jsonb) ? 'location_updated_at' AS unrelated_entity_preserved;