-- =====================================================
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

    -- Auto-deny other pending bookings for the same property
    UPDATE booking_requests
    SET status = 'denied'
    WHERE property_id = NEW.property_id
      AND status = 'pending'
      AND id != NEW.id;

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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function 2: Update student score on rent payment
CREATE OR REPLACE FUNCTION update_student_score()
RETURNS TRIGGER AS $$
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
    
    -- Send congratulations notification to STUDENT
    INSERT INTO notifications (user_id, title, body)
    VALUES (
      NEW.student_id,
      '🎉 لقد حصلت على نقاط!',
      'تم إضافة 10 نقاط لحسابك لدفع الإيجار في الموعد المحدد. استمر في الالتزام!'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
CREATE TRIGGER validate_student_profile_before_booking
  BEFORE INSERT ON booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION validate_student_booking();

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