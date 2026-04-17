DROP POLICY IF EXISTS "List own cleanup photos" ON storage.objects;
CREATE POLICY "Public read cleanup photos" ON storage.objects FOR SELECT USING (bucket_id = 'cleanup-photos');