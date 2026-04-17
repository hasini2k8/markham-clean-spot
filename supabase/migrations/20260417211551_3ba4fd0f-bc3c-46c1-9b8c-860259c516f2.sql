-- Add public read policy for cleanup-photos bucket if it doesn't exist
DO $$
BEGIN
  -- Check if policy exists, if not create it
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Public read cleanup photos'
  ) THEN
    CREATE POLICY "Public read cleanup photos" 
    ON storage.objects 
    FOR SELECT 
    USING (bucket_id = 'cleanup-photos');
  END IF;
END $$;