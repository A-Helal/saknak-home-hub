-- =====================================================
-- COMPLETE DATABASE FIX + SCHEMA REFRESH
-- =====================================================
-- Run this in: https://supabase.com/dashboard/project/oftnqwmvcpwzsaeajrns/sql
-- =====================================================

-- STEP 1: Show current state
SELECT '🔍 CHECKING CURRENT STATE...' as status;

SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'booking_requests'
ORDER BY ordinal_position;

-- STEP 2: Fix the schema
DO $$ 
DECLARE
  has_user_id BOOLEAN;
  has_student_id BOOLEAN;
  has_owner_id BOOLEAN;
BEGIN
  SELECT '🔧 FIXING SCHEMA...' as status;
  
  -- Check what we have
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'booking_requests' 
    AND column_name = 'user_id'
  ) INTO has_user_id;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'booking_requests' 
    AND column_name = 'student_id'
  ) INTO has_student_id;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'booking_requests' 
    AND column_name = 'owner_id'
  ) INTO has_owner_id;
  
  RAISE NOTICE 'Current: user_id=%, student_id=%, owner_id=%', has_user_id, has_student_id, has_owner_id;
  
  -- Fix 1: Rename user_id to student_id
  IF has_user_id AND NOT has_student_id THEN
    RAISE NOTICE '✅ Renaming user_id to student_id...';
    ALTER TABLE public.booking_requests RENAME COLUMN user_id TO student_id;
  ELSIF has_student_id THEN
    RAISE NOTICE '✅ student_id already exists';
  ELSE
    RAISE WARNING 'Neither user_id nor student_id found - check your table!';
  END IF;
  
  -- Fix 2: Add owner_id if missing
  IF NOT has_owner_id THEN
    RAISE NOTICE '✅ Adding owner_id column...';
    ALTER TABLE public.booking_requests 
    ADD COLUMN owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
    
    -- Populate it
    UPDATE public.booking_requests br
    SET owner_id = p.owner_id
    FROM public.properties p
    WHERE br.property_id = p.id
    AND br.owner_id IS NULL;
    
    -- Make it NOT NULL
    ALTER TABLE public.booking_requests 
    ALTER COLUMN owner_id SET NOT NULL;
  ELSE
    RAISE NOTICE '✅ owner_id already exists';
  END IF;
  
END $$;

-- STEP 3: Add other columns
DO $$
BEGIN
  ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS payment_option TEXT CHECK (payment_option IN ('deposit', 'full_insurance'));
  
  ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;
  
  ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'none' CHECK (payment_status IN ('none', 'confirmed'));
  
  ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS rent_due_date DATE;
  
  ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS rent_paid_date DATE;
END $$;

-- STEP 4: Fix constraints
ALTER TABLE public.booking_requests DROP CONSTRAINT IF EXISTS booking_requests_status_check;
ALTER TABLE public.booking_requests
ADD CONSTRAINT booking_requests_status_check 
CHECK (status IN ('pending', 'accepted', 'rejected', 'denied', 'expired'));

-- STEP 5: Fix indexes
DROP INDEX IF EXISTS public.one_pending_booking_per_user_property;
DROP INDEX IF EXISTS public.idx_booking_requests_user_id;

CREATE UNIQUE INDEX IF NOT EXISTS one_pending_booking_per_student_property
  ON public.booking_requests (student_id, property_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_booking_requests_student_id ON public.booking_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_booking_requests_owner_id ON public.booking_requests(owner_id);
CREATE INDEX IF NOT EXISTS idx_booking_requests_status ON public.booking_requests(status);
CREATE INDEX IF NOT EXISTS idx_booking_requests_property_id ON public.booking_requests(property_id);

-- STEP 6: Fix RLS policies
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

-- STEP 7: Refresh schema cache (PostgREST)
NOTIFY pgrst, 'reload schema';

-- STEP 8: Verify the fix
SELECT '✅ VERIFICATION - Final Schema:' as status;

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'booking_requests'
AND column_name IN ('user_id', 'student_id', 'owner_id', 'property_id', 'status')
ORDER BY column_name;

SELECT '🎉 MIGRATION COMPLETE!' as status;
SELECT 'Expected: student_id, owner_id (NO user_id)' as note;
SELECT 'Next: Go to Settings > API and click "Reload schema" button' as next_step;

