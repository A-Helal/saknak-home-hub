-- =====================================================
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
    
    -- Auto-deny other pending bookings for the same property
    UPDATE booking_requests
    SET status = 'denied'
    WHERE property_id = NEW.property_id
      AND status = 'pending'
      AND id != NEW.id;
  END IF;
  
  -- No notification for 'denied' or 'rejected' status
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
    
    -- Send congratulations notification
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

-- Create trigger for validation
DROP TRIGGER IF EXISTS validate_student_profile_before_booking ON booking_requests;
CREATE TRIGGER validate_student_profile_before_booking
  BEFORE INSERT ON booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION validate_student_booking();

-- 7. ADD INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_booking_requests_status ON booking_requests(status);
CREATE INDEX IF NOT EXISTS idx_booking_requests_student_id ON booking_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_booking_requests_property_id ON booking_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_properties_location ON properties(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
