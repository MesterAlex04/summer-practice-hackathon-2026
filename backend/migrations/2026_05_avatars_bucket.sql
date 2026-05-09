-- ============================================================
-- Migration: Avatars storage bucket
-- Run this in the Supabase SQL editor.
-- ============================================================

-- Public bucket so profile photos can be displayed without signed URLs.
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Anyone can read avatars (bucket is public).
DROP POLICY IF EXISTS "avatars: public read" ON storage.objects;
CREATE POLICY "avatars: public read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- Authenticated users can upload to a folder named after their user id.
DROP POLICY IF EXISTS "avatars: own upload" ON storage.objects;
CREATE POLICY "avatars: own upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can replace/delete their own avatar.
DROP POLICY IF EXISTS "avatars: own update" ON storage.objects;
CREATE POLICY "avatars: own update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars: own delete" ON storage.objects;
CREATE POLICY "avatars: own delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
