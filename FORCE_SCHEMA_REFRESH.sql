-- =====================================================
-- FORCE COMPLETE POSTGREST SCHEMA REFRESH
-- =====================================================
-- This will FORCE PostgREST to reload the schema
-- Run in: https://supabase.com/dashboard/project/oftnqwmvcpwzsaeajrns/sql

-- Step 1: Verify current schema state
SELECT 'Step 1: Checking current schema...' as status;

SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'booking_requests'
AND column_name IN ('user_id', 'student_id', 'owner_id')
ORDER BY column_name;

-- Step 2: Drop ALL views that might reference booking_requests
DROP VIEW IF EXISTS booking_requests_view CASCADE;
DROP MATERIALIZED VIEW IF EXISTS booking_requests_materialized CASCADE;

-- Step 3: Ensure the columns are correct
DO $$
DECLARE
  has_user_id BOOLEAN;
  has_student_id BOOLEAN;
BEGIN
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
  
  IF has_user_id AND NOT has_student_id THEN
    RAISE NOTICE 'Renaming user_id to student_id...';
    ALTER TABLE public.booking_requests RENAME COLUMN user_id TO student_id;
  ELSIF has_user_id AND has_student_id THEN
    RAISE NOTICE 'Both columns exist! Dropping user_id...';
    ALTER TABLE public.booking_requests DROP COLUMN user_id;
  ELSIF has_student_id THEN
    RAISE NOTICE 'student_id already exists and user_id is gone - CORRECT!';
  ELSE
    RAISE EXCEPTION 'Neither column exists - check your table!';
  END IF;
END $$;

-- Step 4: Force complete schema reload multiple ways
-- Method 1: NOTIFY pgrst
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- Method 2: Update a comment to trigger schema detection
COMMENT ON TABLE public.booking_requests IS 'Schema refreshed at ' || NOW()::TEXT;

-- Method 3: Temporarily disable and re-enable RLS (forces PostgREST to reload)
ALTER TABLE public.booking_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;

-- Step 5: Recreate ALL RLS policies from scratch
DROP POLICY IF EXISTS "Students can view their own booking requests" ON public.booking_requests;
DROP POLICY IF EXISTS "Owners can view booking requests for their properties" ON public.booking_requests;
DROP POLICY IF EXISTS "Students can create booking requests" ON public.booking_requests;
DROP POLICY IF EXISTS "Owners can update booking request status" ON public.booking_requests;
DROP POLICY IF EXISTS "Users can view booking requests" ON public.booking_requests;
DROP POLICY IF EXISTS "Users can create booking requests" ON public.booking_requests;

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

-- Step 6: Verify the final state
SELECT 'Step 6: Final verification...' as status;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'booking_requests'
ORDER BY ordinal_position;

-- Step 7: Check all policies
SELECT 'Step 7: Current RLS policies...' as status;

SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'booking_requests';

SELECT '✅ COMPLETE!' as status;
SELECT 'NOW: Go to Settings > API and click "Reload schema" button!' as next_step;


