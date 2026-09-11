-- ============================================
-- Social Media Connective - Storage Bucket Setup
-- Creates the 'media' bucket for content uploads
-- Run this in Supabase SQL Editor if migration doesn't apply automatically
-- ============================================

-- Create the media bucket (public for read)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'media'
  ) THEN
    PERFORM storage.create_bucket('media', 'Media storage for content', true);
  END IF;
END $$;

-- Drop existing policies if any to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Public can view media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload to media" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for media" ON storage.objects;

-- Allow ANYONE to upload (anon + authenticated) - needed for server-side routes
CREATE POLICY "Anyone can upload to media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'media'
  );

-- Allow public read access to media bucket
CREATE POLICY "Public read access for media" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'media'
  );

-- Allow anyone to delete from media bucket
CREATE POLICY "Anyone can delete from media" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'media'
  );
