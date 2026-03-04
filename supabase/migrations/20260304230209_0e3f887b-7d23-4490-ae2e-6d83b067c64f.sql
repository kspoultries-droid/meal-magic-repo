INSERT INTO storage.buckets (id, name, public) VALUES ('service-icons', 'service-icons', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Public read access" ON storage.objects FOR SELECT USING (bucket_id = 'service-icons');