-- Run inside an authenticated test session, with fixtures rolled back.
-- Empty scope is no longer a nationwide grant; primary owner remains protected.
SELECT pg_get_functiondef('public.staff_city_allowed(uuid)'::regprocedure)
 NOT LIKE '%NOT EXISTS(SELECT 1 FROM%staff_scopes%' AS empty_scope_not_nationwide;
SELECT public.staff_audit_redact('{"phone":"private","account_number":"private","status":"pending"}'::jsonb)
 = '{"phone":"[redacted]","account_number":"[redacted]","status":"pending"}'::jsonb AS audit_sensitive_fields_redacted;