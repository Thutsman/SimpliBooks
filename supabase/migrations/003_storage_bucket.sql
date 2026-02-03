  -- Create storage bucket for company logos
  -- Run this in Supabase SQL Editor or via migrations

  -- Create the company-logos bucket if it doesn't exist
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'company-logos',
    'company-logos',
    true,  -- Public bucket so logos can be displayed without auth
    2097152,  -- 2MB limit
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
  )
  ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

  -- Storage policies for company-logos bucket

  -- Allow authenticated users to upload logos to their company folder
  CREATE POLICY "Users can upload logos to their company folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM companies WHERE user_id = auth.uid()
    )
  );

  -- Allow authenticated users to update logos in their company folder
  CREATE POLICY "Users can update logos in their company folder"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM companies WHERE user_id = auth.uid()
    )
  );

  -- Allow authenticated users to delete logos from their company folder
  CREATE POLICY "Users can delete logos from their company folder"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM companies WHERE user_id = auth.uid()
    )
  );

  -- Allow public read access to all logos (since bucket is public)
  CREATE POLICY "Public read access for company logos"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'company-logos');
