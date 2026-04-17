
DROP POLICY IF EXISTS "Public read cleanup photos" ON storage.objects;
CREATE POLICY "Auth list cleanup photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'cleanup-photos');
