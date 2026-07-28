-- Insert bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('leis', 'leis', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow public viewing of laws
CREATE POLICY "Public Access Leis"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'leis' );

-- Policy to allow authenticated users to upload laws
CREATE POLICY "Authenticated Upload Leis"
  ON storage.objects FOR INSERT
  WITH CHECK ( bucket_id = 'leis' AND auth.role() = 'authenticated' );

-- Policy to allow authenticated users to update their files
CREATE POLICY "Authenticated Update Leis"
  ON storage.objects FOR UPDATE
  USING ( bucket_id = 'leis' AND auth.role() = 'authenticated' );

-- Policy to allow authenticated users to delete files
CREATE POLICY "Authenticated Delete Leis"
  ON storage.objects FOR DELETE
  USING ( bucket_id = 'leis' AND auth.role() = 'authenticated' );
