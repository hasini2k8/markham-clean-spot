
DROP POLICY IF EXISTS "Auth list cleanup photos" ON storage.objects;
CREATE POLICY "List own cleanup photos" ON storage.objects FOR SELECT TO authenticated 
  USING (bucket_id = 'cleanup-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
