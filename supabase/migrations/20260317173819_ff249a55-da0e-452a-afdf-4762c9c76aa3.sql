INSERT INTO storage.buckets (id, name, public) VALUES ('tiktok-videos', 'tiktok-videos', true);

CREATE POLICY "Public read access" ON storage.objects FOR SELECT USING (bucket_id = 'tiktok-videos');
CREATE POLICY "Service role insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'tiktok-videos');