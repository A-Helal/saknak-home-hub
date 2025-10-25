-- ============================================
-- STORAGE BUCKETS AND RLS POLICIES
-- ============================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('civil_ids', 'civil_ids', false),
  ('ownership_images', 'ownership_images', false),
  ('payment_proofs', 'payment_proofs', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- CIVIL IDS BUCKET POLICIES
-- ============================================

-- Students can upload their own civil ID
CREATE POLICY "Students can upload their civil ID"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'civil_ids' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Students can view their own civil ID
CREATE POLICY "Students can view their own civil ID"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'civil_ids' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Students can update their own civil ID
CREATE POLICY "Students can update their civil ID"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'civil_ids' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Students can delete their own civil ID
CREATE POLICY "Students can delete their civil ID"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'civil_ids' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================
-- OWNERSHIP IMAGES BUCKET POLICIES
-- ============================================

-- Owners can upload their ownership images
CREATE POLICY "Owners can upload ownership images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ownership_images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Owners can view their own ownership images
CREATE POLICY "Owners can view their ownership images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'ownership_images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Owners can update their ownership images
CREATE POLICY "Owners can update their ownership images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'ownership_images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Owners can delete their ownership images
CREATE POLICY "Owners can delete their ownership images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'ownership_images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================
-- PAYMENT PROOFS BUCKET POLICIES
-- ============================================

-- Students can upload payment proofs
CREATE POLICY "Students can upload payment proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment_proofs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Students can view their own payment proofs
CREATE POLICY "Students can view their payment proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment_proofs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Owners can view payment proofs for their properties
CREATE POLICY "Owners can view payment proofs for their bookings"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment_proofs'
  AND EXISTS (
    SELECT 1 FROM booking_requests br
    WHERE br.owner_id = auth.uid()
    AND br.payment_proof_url LIKE '%' || (storage.foldername(name))[1] || '%'
  )
);

-- Students can update their payment proofs
CREATE POLICY "Students can update their payment proofs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'payment_proofs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Students can delete their payment proofs
CREATE POLICY "Students can delete their payment proofs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment_proofs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
