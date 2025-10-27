-- =====================================================
<<<<<<< HEAD
-- FIXES AND IMPROVEMENTS MIGRATION
-- =====================================================
-- 1. Update student levels (1-5, excellence, graduate)
-- 2. Fix owner refusal - no notification on denial
-- 3. Prevent duplicate reservations
-- 4. Add map fields to properties table
-- 5. Confirm rent payment scoring trigger
-- =====================================================

-- 1. UPDATE STUDENT LEVELS
-- =====================================================
-- Drop old constraint and add new one with extended levels
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_level_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_level_check
  CHECK (level IN ('1', '2', '3', '4', '5', 'excellence', 'graduate'));

COMMENT ON COLUMN profiles.level IS 'Student level: 1, 2, 3, 4, 5, excellence, or graduate';

-- 2. FIX OWNER REFUSAL - NO NOTIFICATION ON DENIAL
-- =====================================================
-- Update the notification trigger to only send on accepted, not denied
CREATE OR REPLACE FUNCTION notify_booking_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Only send notification if status changed to 'accepted'
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    INSERT INTO notifications (user_id, title, body)
    VALUES (
      (SELECT user_id FROM profiles WHERE id = NEW.student_id),
      'تم قبول حجزك',
      'تم قبول طلب الحجز الخاص بك من قبل المالك'
    );
    
=======
-- DIAGNOSIS AND FIX FOR user_id ERROR
-- =====================================================
-- This script will find and fix all triggers referencing user_id

-- Step 1: Find all triggers on booking_requests table
-- Run this to see what triggers exist
SELECT 
    t.tgname AS trigger_name,
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'booking_requests';

-- Step 2: Drop ALL triggers on booking_requests and recreate them correctly
-- =====================================================

-- Drop all existing triggers
DROP TRIGGER IF EXISTS booking_status_notification ON booking_requests;
DROP TRIGGER IF EXISTS add_score_on_payment ON booking_requests;
DROP TRIGGER IF EXISTS validate_student_profile_before_booking ON booking_requests;
DROP TRIGGER IF EXISTS set_updated_at ON booking_requests;

-- Drop old functions that might reference user_id
DROP FUNCTION IF EXISTS notify_booking_status() CASCADE;
DROP FUNCTION IF EXISTS update_student_score() CASCADE;
DROP FUNCTION IF EXISTS validate_student_booking() CASCADE;

-- Step 3: Recreate all functions with CORRECT field names
-- =====================================================

-- Function 1: Notification on booking status change
CREATE OR REPLACE FUNCTION notify_booking_status()
RETURNS TRIGGER AS $$
DECLARE
  notification_title TEXT;
  notification_body TEXT;
BEGIN
  -- Send notification on status change to 'accepted', 'rejected', or 'denied'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    notification_title := 'تم قبول حجزك';
    notification_body := 'تهانينا! تم قبول طلب الحجز الخاص بك من قبل المالك.';

>>>>>>> dda508213143baa660dba93db988962291c5fe46
    -- Auto-deny other pending bookings for the same property
    UPDATE booking_requests
    SET status = 'denied'
    WHERE property_id = NEW.property_id
      AND status = 'pending'
      AND id != NEW.id;
<<<<<<< HEAD
  END IF;
  
  -- No notification for 'denied' or 'rejected' status
=======

    -- Send notification to STUDENT (not user_id!)
    INSERT INTO notifications (user_id, title, body)
    VALUES (NEW.student_id, notification_title, notification_body);

  ELSIF (NEW.status = 'rejected' OR NEW.status = 'denied') 
        AND (OLD.status IS NULL OR (OLD.status != 'rejected' AND OLD.status != 'denied')) THEN
    notification_title := 'تم رفض حجزك';
    notification_body := 'نأسف لإبلاغك، ولكن تم رفض طلب الحجز الخاص بك من قبل المالك.';

    -- Send notification to STUDENT (not user_id!)
    INSERT INTO notifications (user_id, title, body)
    VALUES (NEW.student_id, notification_title, notification_body);
  END IF;
  
>>>>>>> dda508213143baa660dba93db988962291c5fe46
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

<<<<<<< HEAD
-- Recreate trigger
DROP TRIGGER IF EXISTS booking_status_notification ON booking_requests;
CREATE TRIGGER booking_status_notification
  AFTER UPDATE OF status ON booking_requests
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_booking_status();

-- 3. PREVENT DUPLICATE RESERVATIONS
-- =====================================================
-- Create unique index to prevent multiple pending bookings
-- for the same student on the same property
CREATE UNIQUE INDEX IF NOT EXISTS one_pending_booking_per_student_property
  ON booking_requests (student_id, property_id)
  WHERE status = 'pending';

COMMENT ON INDEX one_pending_booking_per_student_property IS 
  'Ensures a student can only have one pending booking per property at a time';

-- 4. ENSURE MAP FIELDS EXIST
-- =====================================================
-- Add latitude and longitude to properties if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE properties ADD COLUMN latitude DOUBLE PRECISION;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' AND column_name = 'longitude'
  ) THEN
    ALTER TABLE properties ADD COLUMN longitude DOUBLE PRECISION;
  END IF;
END $$;

-- Add address_details jsonb field if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' AND column_name = 'address_details'
  ) THEN
    ALTER TABLE properties ADD COLUMN address_details JSONB;
  END IF;
END $$;

COMMENT ON COLUMN properties.latitude IS 'Property latitude for map display';
COMMENT ON COLUMN properties.longitude IS 'Property longitude for map display';
COMMENT ON COLUMN properties.address_details IS 'Complete address information including geocoded data';

-- 5. CONFIRM RENT PAYMENT SCORING (+10 POINTS)
-- =====================================================
-- Update the scoring function to be more robust
CREATE OR REPLACE FUNCTION update_student_score()
RETURNS TRIGGER AS $$  
=======
-- Function 2: Update student score on rent payment
CREATE OR REPLACE FUNCTION update_student_score()
RETURNS TRIGGER AS $$
>>>>>>> dda508213143baa660dba93db988962291c5fe46
BEGIN
  -- Check if rent was paid before or on the due date
  IF NEW.rent_paid_date IS NOT NULL 
     AND NEW.rent_due_date IS NOT NULL 
     AND NEW.rent_paid_date <= NEW.rent_due_date 
     AND (OLD.rent_paid_date IS NULL OR OLD.rent_paid_date IS DISTINCT FROM NEW.rent_paid_date)
  THEN
    -- Add 10 points to student's score
    UPDATE profiles
    SET score = COALESCE(score, 0) + 10
    WHERE id = NEW.student_id;
    
<<<<<<< HEAD
    -- Send congratulations notification
=======
    -- Send congratulations notification to STUDENT
>>>>>>> dda508213143baa660dba93db988962291c5fe46
    INSERT INTO notifications (user_id, title, body)
    VALUES (
      NEW.student_id,
      '🎉 لقد حصلت على نقاط!',
      'تم إضافة 10 نقاط لحسابك لدفع الإيجار في الموعد المحدد. استمر في الالتزام!'
    );
  END IF;
<<<<<<< HEAD

=======
  
>>>>>>> dda508213143baa660dba93db988962291c5fe46
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

<<<<<<< HEAD
-- Recreate the trigger
DROP TRIGGER IF EXISTS add_score_on_payment ON booking_requests;
CREATE TRIGGER add_score_on_payment
  AFTER UPDATE OF rent_paid_date ON booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_student_score();

-- 6. ADD VALIDATION FUNCTION FOR PROFILE COMPLETENESS
-- =====================================================
-- Ensure students complete profile before booking
CREATE OR REPLACE FUNCTION validate_student_booking()
RETURNS TRIGGER AS $$  
DECLARE
  v_profile RECORD;
BEGIN
  -- Get student profile
  SELECT * INTO v_profile
  FROM profiles
  WHERE id = NEW.student_id;

=======
-- Function 3: Validate student profile before booking
CREATE OR REPLACE FUNCTION validate_student_booking()
RETURNS TRIGGER AS $$
DECLARE
  v_profile RECORD;
BEGIN
  -- Get student profile using student_id (not user_id!)
  SELECT * INTO v_profile
  FROM profiles
  WHERE id = NEW.student_id;
  
>>>>>>> dda508213143baa660dba93db988962291c5fe46
  -- Check if student profile is complete
  IF v_profile.user_type = 'student' THEN
    IF v_profile.civil_id_url IS NULL 
       OR v_profile.city IS NULL 
       OR v_profile.area IS NULL 
       OR v_profile.college IS NULL 
       OR v_profile.level IS NULL 
    THEN
      RAISE EXCEPTION 'يجب إكمال الملف الشخصي قبل الحجز (البطاقة المدنية، المدينة، المنطقة، الكلية، المستوى)'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
<<<<<<< HEAD

=======
  
>>>>>>> dda508213143baa660dba93db988962291c5fe46
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

<<<<<<< HEAD
-- Create trigger for validation
DROP TRIGGER IF EXISTS validate_student_profile_before_booking ON booking_requests;
=======
-- Function 4: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create all triggers
-- =====================================================

-- Trigger 1: Booking status notification
CREATE TRIGGER booking_status_notification
  AFTER UPDATE OF status ON booking_requests
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_booking_status();

-- Trigger 2: Score on rent payment
CREATE TRIGGER add_score_on_payment
  AFTER UPDATE OF rent_paid_date ON booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_student_score();

-- Trigger 3: Validate student profile before booking
>>>>>>> dda508213143baa660dba93db988962291c5fe46
CREATE TRIGGER validate_student_profile_before_booking
  BEFORE INSERT ON booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION validate_student_booking();

<<<<<<< HEAD
-- 7. ADD INDEXES FOR PERFORMANCE

CREATE INDEX IF NOT EXISTS idx_booking_requests_status ON booking_requests(status);
CREATE INDEX IF NOT EXISTS idx_booking_requests_student_id ON booking_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_booking_requests_property_id ON booking_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_properties_location ON properties(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
=======
-- Trigger 4: Auto-update updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 5: Verify the fix
-- =====================================================
-- Run this to confirm all triggers are using correct fields
SELECT 
    t.tgname AS trigger_name,
    p.proname AS function_name,
    CASE 
        WHEN pg_get_functiondef(p.oid) LIKE '%user_id%' 
        AND pg_get_functiondef(p.oid) NOT LIKE '%notifications%user_id%'
        THEN '❌ Still has user_id reference!'
        ELSE '✅ Looks good'
    END AS status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'booking_requests';

-- =====================================================
-- COMPLETE FIX APPLIED
-- =====================================================
-- All triggers now correctly use:
-- - NEW.student_id (for student references)
-- - NEW.owner_id (for owner references)  
-- - NEW.property_id (for property references)
-- 
-- The only user_id references are in INSERT INTO notifications
-- which is CORRECT because notifications table has user_id column
-- =====================================================
>>>>>>> dda508213143baa660dba93db988962291c5fe46
