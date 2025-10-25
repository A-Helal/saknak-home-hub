-- =====================================================
-- FIX USER_ID REFERENCES IN BOOKING_REQUESTS
-- =====================================================
-- The booking_requests table uses 'student_id', not 'user_id'
-- This migration fixes all functions and triggers that
-- incorrectly reference 'user_id'
-- =====================================================

-- 1. FIX PREVENT OWNER SELF-BOOKING FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION prevent_owner_self_booking()
RETURNS TRIGGER AS $$
DECLARE
  v_property_owner_id UUID;
BEGIN
  -- Get the owner of the property
  SELECT owner_id INTO v_property_owner_id
  FROM properties
  WHERE id = NEW.property_id;
  
  -- Check if the user trying to book is the owner
  -- USE student_id instead of user_id
  IF NEW.student_id = v_property_owner_id THEN
    RAISE EXCEPTION 'لا يمكن للمالك حجز عقاره الخاص'
      USING ERRCODE = 'check_violation';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. FIX BOOKING STATUS NOTIFICATION FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION notify_booking_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Only send notification if status changed to 'accepted'
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    -- USE student_id instead of user_id
    INSERT INTO notifications (user_id, title, body)
    VALUES (
      NEW.student_id,
      'تم قبول حجزك',
      'تم قبول طلب الحجز الخاص بك من قبل المالك'
    );
    
    -- Auto-deny other pending bookings for the same property
    UPDATE booking_requests
    SET status = 'denied'
    WHERE property_id = NEW.property_id
      AND status = 'pending'
      AND id != NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. FIX STUDENT SCORE UPDATE FUNCTION
-- =====================================================
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
    -- USE student_id instead of user_id
    UPDATE profiles
    SET score = COALESCE(score, 0) + 10
    WHERE id = NEW.student_id;
    
    -- Send congratulations notification
    -- USE student_id instead of user_id
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

-- 4. FIX STUDENT BOOKING VALIDATION FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION validate_student_booking()
RETURNS TRIGGER AS $$
DECLARE
  v_profile RECORD;
BEGIN
  -- Get student profile
  -- USE student_id instead of user_id
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

-- 5. FIX UNIQUE INDEX FOR DUPLICATE PREVENTION
-- =====================================================
-- Drop the incorrect index that uses user_id
DROP INDEX IF EXISTS one_pending_booking_per_user_property;

-- Create correct index using student_id
CREATE UNIQUE INDEX IF NOT EXISTS one_pending_booking_per_student_property
  ON booking_requests (student_id, property_id)
  WHERE status = 'pending';

COMMENT ON INDEX one_pending_booking_per_student_property IS 
  'Ensures a student can only have one pending booking per property at a time';

-- 6. FIX PERFORMANCE INDEX
-- =====================================================
-- The index on user_id should not exist since that column doesn't exist
-- Just ensure we have the correct indexes
DROP INDEX IF EXISTS idx_booking_requests_user_id;

-- Ensure we have proper indexes (these should already exist from initial migration)
CREATE INDEX IF NOT EXISTS idx_booking_requests_student_id ON booking_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_booking_requests_owner_id ON booking_requests(owner_id);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- ✅ All functions now correctly use student_id instead of user_id
-- ✅ Unique index fixed for duplicate prevention
-- ✅ Performance indexes corrected
-- =====================================================

