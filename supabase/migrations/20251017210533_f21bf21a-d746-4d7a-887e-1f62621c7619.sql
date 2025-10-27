-- Create storage bucket for property images
INSERT INTO storage.buckets (id, name, public)
<<<<<<< HEAD
VALUES ('property-images', 'property-images', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-videos', 'property-videos', true)
ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.properties
ADD COLUMN video_url text;
DROP POLICY IF EXISTS "Anyone can view property images" ON storage.objects;
CREATE POLICY "Anyone can view property images"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-images');
DROP POLICY IF EXISTS "Authenticated users can upload property images" ON storage.objects;
CREATE POLICY "Authenticated users can upload property images"
ON storage.objects FOR INSERT
WITH CHECK (
bucket_id = 'property-images'
AND auth.role() = 'authenticated'
);
DROP POLICY IF EXISTS "Users can update their own property images" ON storage.objects;
CREATE POLICY "Users can update their own property images"
ON storage.objects FOR UPDATE
USING (
bucket_id = 'property-images'
AND auth.uid()::text = (storage.foldername(name))[1]
);
DROP POLICY IF EXISTS "Users can delete their own property images" ON storage.objects;
CREATE POLICY "Users can delete their own property images"
ON storage.objects FOR DELETE
USING (
bucket_id = 'property-images'
AND auth.uid()::text = (storage.foldername(name))[1]
);
-- Storage policies for property videos
DROP POLICY IF EXISTS "Anyone can view property videos" ON storage.objects;
CREATE POLICY "Anyone can view property videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-videos');
DROP POLICY IF EXISTS "Authenticated users can upload property videos" ON storage.objects;
CREATE POLICY "Authenticated users can upload property videos"
ON storage.objects FOR INSERT
WITH CHECK (
bucket_id = 'property-videos'
AND auth.role() = 'authenticated'
);
DROP POLICY IF EXISTS "Users can update their own property videos" ON storage.objects;
CREATE POLICY "Users can update their own property videos"
ON storage.objects FOR UPDATE
USING (
bucket_id = 'property-videos'
AND auth.uid()::text = (storage.foldername(name))[1]
);
DROP POLICY IF EXISTS "Users can delete their own property videos" ON storage.objects;
CREATE POLICY "Users can delete their own property videos"
ON storage.objects FOR DELETE
USING (
bucket_id = 'property-videos'
AND auth.uid()::text = (storage.foldername(name))[1]
=======
VALUES ('property-images', 'property-images', true);

-- Create storage bucket for property videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-videos', 'property-videos', true);

-- Add video_url column to properties table
ALTER TABLE public.properties
ADD COLUMN video_url text;

-- Storage policies for property images
CREATE POLICY "Anyone can view property images"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-images');

CREATE POLICY "Authenticated users can upload property images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'property-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own property images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'property-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own property images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'property-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for property videos
CREATE POLICY "Anyone can view property videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-videos');

CREATE POLICY "Authenticated users can upload property videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'property-videos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own property videos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'property-videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own property videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'property-videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
>>>>>>> dda508213143baa660dba93db988962291c5fe46
);