CREATE OR REPLACE FUNCTION public.save_company_settings(_values jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE k text; v text; BEGIN
 IF auth.uid() IS NULL OR NOT has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin access required'; END IF;
 IF _values IS NULL OR jsonb_typeof(_values)<>'object' THEN RAISE EXCEPTION 'Invalid settings'; END IF;
 FOR k,v IN SELECT key,value FROM jsonb_each_text(_values) LOOP
 IF k NOT IN ('helpline_phone','whatsapp_number','contact_email','company_about','company_address','company_careers','company_blog','social_facebook','social_instagram','social_x','legal_terms','legal_privacy','legal_cookies') THEN RAISE EXCEPTION 'Unsupported setting'; END IF;
 IF v IS NULL OR length(v)>(CASE WHEN k LIKE 'legal_%' THEN 20000 WHEN k='company_about' THEN 10000 ELSE 500 END) THEN RAISE EXCEPTION 'Value too long'; END IF;
 IF k IN ('company_careers','company_blog','social_facebook','social_instagram','social_x') AND v<>'' AND v !~ '^https://[^[:space:]]+$' THEN RAISE EXCEPTION 'Use an https link'; END IF;
 IF k IN ('helpline_phone','whatsapp_number') AND v<>'' AND v !~ '^\+?[0-9]{10,15}$' THEN RAISE EXCEPTION 'Invalid phone'; END IF;
 IF k='contact_email' AND v<>'' AND (length(v)>255 OR v !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') THEN RAISE EXCEPTION 'Invalid email'; END IF;
 INSERT INTO app_settings(key,value) VALUES(k,trim(v)) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.save_company_settings(jsonb) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.save_company_settings(jsonb) TO authenticated;