DROP POLICY IF EXISTS "Service role insert" ON storage.objects;

CREATE POLICY "Service role insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'tiktok-videos'
    AND (select auth.role()) = 'service_role'
  );