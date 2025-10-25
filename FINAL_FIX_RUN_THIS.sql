-- =====================================================
-- FINAL FIX - RUN THIS IN SUPABASE SQL EDITOR
-- =====================================================
-- URL: https://supabase.com/dashboard/project/oftnqwmvcpwzsaeajrns/sql
-- =====================================================

-- First, let's see what we have
SELECT 'Current booking_requests columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'booking_requests'
ORDER BY ordinal_position;

-- Check if we need to do the migration
DO $$ 
DECLARE
  has_user_id BOOLEAN;
  has_student_id BOOLEAN;
  has_owner_id BOOLEAN;
BEGIN
  -- Check current state
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'booking_requests' AND column_name = 'user_id'
  ) INTO has_user_id;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'booking_requests' AND column_name = 'student_id'
  ) INTO has_student_id;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'booking_requests' AND column_name = 'owner_id'
  ) INTO has_owner_id;
  
  RAISE NOTICE 'Current state: user_id=%, student_id=%, owner_id=%', has_user_id, has_student_id, has_owner_id;
  
  -- CRITICAL FIX: Rename user_id to student_id
  IF has_user_id AND NOT has_student_id THEN
    RAISE NOTICE '🔧 Renaming user_id to student_id...';
    ALTER TABLE public.booking_requests RENAME COLUMN user_id TO student_id;
    RAISE NOTICE '✅ Renamed user_id to student_id';
  ELSIF has_student_id THEN
    RAISE NOTICE '✅ student_id column already exists';
  ELSE
    RAISE EXCEPTION 'ERROR: Neither user_id nor student_id exists! Check table schema.';
  END IF;
  
  -- Add owner_id if missing
  IF NOT has_owner_id THEN
    RAISE NOTICE '🔧 Adding owner_id column...';
    ALTER TABLE public.booking_requests 
    ADD COLUMN owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
    
    -- Populate from properties
    UPDATE public.booking_requests br
    SET owner_id = p.owner_id
    FROM public.properties p
    WHERE br.property_id = p.id
    AND br.owner_id IS NULL;
    
    -- Make it required
    ALTER TABLE public.booking_requests 
    ALTER COLUMN owner_id SET NOT NULL;
    
    RAISE NOTICE '✅ Added and populated owner_id';
  ELSE
    RAISE NOTICE '✅ owner_id column already exists';
  END IF;
  
END $$;

-- Add other required columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'booking_requests' AND column_name = 'payment_option'
  ) THEN
    ALTER TABLE public.booking_requests
    ADD COLUMN payment_option TEXT CHECK (payment_option IN ('deposit', 'full_insurance'));
    RAISE NOTICE '✅ Added payment_option';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'booking_requests' AND column_name = 'payment_proof_url'
  ) THEN
    ALTER TABLE public.booking_requests ADD COLUMN payment_proof_url TEXT;
    RAISE NOTICE '✅ Added payment_proof_url';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'booking_requests' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE public.booking_requests
    ADD COLUMN payment_status TEXT DEFAULT 'none' CHECK (payment_status IN ('none', 'confirmed'));
    RAISE NOTICE '✅ Added payment_status';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'booking_requests' AND column_name = 'rent_due_date'
  ) THEN
    ALTER TABLE public.booking_requests ADD COLUMN rent_due_date DATE;
    RAISE NOTICE '✅ Added rent_due_date';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'booking_requests' AND column_name = 'rent_paid_date'
  ) THEN
    ALTER TABLE public.booking_requests ADD COLUMN rent_paid_date DATE;
    RAISE NOTICE '✅ Added rent_paid_date';
  END IF;
END $$;

-- Fix status constraint
ALTER TABLE public.booking_requests DROP CONSTRAINT IF EXISTS booking_requests_status_check;
ALTER TABLE public.booking_requests
ADD CONSTRAINT booking_requests_status_check 
CHECK (status IN ('pending', 'accepted', 'rejected', 'denied', 'expired'));

-- Drop old indexes
DROP INDEX IF EXISTS public.one_pending_booking_per_user_property;
DROP INDEX IF EXISTS public.idx_booking_requests_user_id;

-- Create new indexes
CREATE UNIQUE INDEX IF NOT EXISTS one_pending_booking_per_student_property
  ON public.booking_requests (student_id, property_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_booking_requests_student_id ON public.booking_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_booking_requests_owner_id ON public.booking_requests(owner_id);
CREATE INDEX IF NOT EXISTS idx_booking_requests_status ON public.booking_requests(status);
CREATE INDEX IF NOT EXISTS idx_booking_requests_property_id ON public.booking_requests(property_id);

-- Fix RLS policies
DROP POLICY IF EXISTS "Students can view their own booking requests" ON public.booking_requests;
DROP POLICY IF EXISTS "Owners can view booking requests for their properties" ON public.booking_requests;
DROP POLICY IF EXISTS "Students can create booking requests" ON public.booking_requests;
DROP POLICY IF EXISTS "Owners can update booking request status" ON public.booking_requests;

CREATE POLICY "Students can view their own booking requests"
  ON public.booking_requests FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Owners can view booking requests for their properties"
  ON public.booking_requests FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Students can create booking requests"
  ON public.booking_requests FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Owners can update booking request status"
  ON public.booking_requests FOR UPDATE
  USING (auth.uid() = owner_id);

-- Verify the fix
SELECT 'After migration - booking_requests columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'booking_requests'
AND column_name IN ('user_id', 'student_id', 'owner_id')
ORDER BY column_name;

-- THIS SHOULD SHOW:
-- owner_id   | uuid | NO
-- student_id | uuid | NO
-- (NO user_id should appear!)

SELECT '✅ MIGRATION COMPLETE!' as status;
SELECT 'If you see student_id and owner_id above (and NO user_id), the fix worked!' as next_step;

