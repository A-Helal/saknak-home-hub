-- =====================================================
-- FIX BOOKING REQUESTS SCHEMA
-- =====================================================
-- This migration handles both possible scenarios:
-- 1. Table has user_id column
-- 2. Table has student_id and owner_id columns
-- =====================================================

-- First, let's check if the table exists and what columns it has
DO $$ 
DECLARE
  has_user_id BOOLEAN;
  has_student_id BOOLEAN;
  has_owner_id BOOLEAN;
BEGIN
  -- Check if columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'booking_requests' AND column_name = 'user_id'
  ) INTO has_user_id;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'booking_requests' AND column_name = 'student_id'
  ) INTO has_student_id;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'booking_requests' AND column_name = 'owner_id'
  ) INTO has_owner_id;
  
  -- If we have user_id but not student_id, rename user_id to student_id
  IF has_user_id AND NOT has_student_id THEN
    RAISE NOTICE 'Renaming user_id to student_id...';
    ALTER TABLE booking_requests RENAME COLUMN user_id TO student_id;
  END IF;
  
  -- If we don't have owner_id, we need to add it
  IF NOT has_owner_id THEN
    RAISE NOTICE 'Adding owner_id column...';
    ALTER TABLE booking_requests 
    ADD COLUMN owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
    
    -- Populate owner_id from property ownership
    UPDATE booking_requests br
    SET owner_id = p.owner_id
    FROM properties p
    WHERE br.property_id = p.id
    AND br.owner_id IS NULL;
    
    -- Make it NOT NULL after populating
    ALTER TABLE booking_requests 
    ALTER COLUMN owner_id SET NOT NULL;
  END IF;
  
END $$;

-- =====================================================
-- ENSURE ALL REQUIRED COLUMNS EXIST
-- =====================================================
-- Add payment and rental management columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'booking_requests' AND column_name = 'payment_option'
  ) THEN
    ALTER TABLE booking_requests
    ADD COLUMN payment_option TEXT CHECK (payment_option IN ('deposit', 'full_insurance'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'booking_requests' AND column_name = 'payment_proof_url'
  ) THEN
    ALTER TABLE booking_requests
    ADD COLUMN payment_proof_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'booking_requests' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE booking_requests
    ADD COLUMN payment_status TEXT DEFAULT 'none' CHECK (payment_status IN ('none', 'confirmed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'booking_requests' AND column_name = 'rent_due_date'
  ) THEN
    ALTER TABLE booking_requests
    ADD COLUMN rent_due_date DATE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'booking_requests' AND column_name = 'rent_paid_date'
  ) THEN
    ALTER TABLE booking_requests
    ADD COLUMN rent_paid_date DATE;
  END IF;
END $$;

-- =====================================================
-- UPDATE STATUS CONSTRAINT
-- =====================================================
ALTER TABLE booking_requests DROP CONSTRAINT IF EXISTS booking_requests_status_check;
ALTER TABLE booking_requests
ADD CONSTRAINT booking_requests_status_check 
CHECK (status IN ('pending', 'accepted', 'rejected', 'denied', 'expired'));

-- =====================================================
-- FIX ALL TRIGGERS AND FUNCTIONS
-- =====================================================

-- 1. PREVENT OWNER SELF-BOOKING
CREATE OR REPLACE FUNCTION prevent_owner_self_booking()
RETURNS TRIGGER AS $$
DECLARE
  v_property_owner_id UUID;
BEGIN
  SELECT owner_id INTO v_property_owner_id
  FROM properties
  WHERE id = NEW.property_id;
  
  IF NEW.student_id = v_property_owner_id THEN
    RAISE EXCEPTION 'لا يمكن للمالك حجز عقاره الخاص'
      USING ERRCODE = 'check_violation';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_owner_self_booking_trigger ON booking_requests;
CREATE TRIGGER prevent_owner_self_booking_trigger
  BEFORE INSERT ON booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION prevent_owner_self_booking();

-- 2. BOOKING STATUS NOTIFICATION
CREATE OR REPLACE FUNCTION notify_booking_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    INSERT INTO notifications (user_id, title, body)
    VALUES (
      NEW.student_id,
      'تم قبول حجزك',
      'تم قبول طلب الحجز الخاص بك من قبل المالك'
    );
    
    UPDATE booking_requests
    SET status = 'denied'
    WHERE property_id = NEW.property_id
      AND status = 'pending'
      AND id != NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS booking_status_notification ON booking_requests;
CREATE TRIGGER booking_status_notification
  AFTER UPDATE OF status ON booking_requests
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_booking_status();

-- 3. STUDENT SCORE UPDATE
CREATE OR REPLACE FUNCTION update_student_score()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.rent_paid_date IS NOT NULL 
     AND NEW.rent_due_date IS NOT NULL 
     AND NEW.rent_paid_date <= NEW.rent_due_date 
     AND (OLD.rent_paid_date IS NULL OR OLD.rent_paid_date IS DISTINCT FROM NEW.rent_paid_date)
  THEN
    UPDATE profiles
    SET score = COALESCE(score, 0) + 10
    WHERE id = NEW.student_id;
    
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

DROP TRIGGER IF EXISTS add_score_on_payment ON booking_requests;
CREATE TRIGGER add_score_on_payment
  AFTER UPDATE OF rent_paid_date ON booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_student_score();

-- 4. STUDENT PROFILE VALIDATION
CREATE OR REPLACE FUNCTION validate_student_booking()
RETURNS TRIGGER AS $$
DECLARE
  v_profile RECORD;
BEGIN
  SELECT * INTO v_profile
  FROM profiles
  WHERE id = NEW.student_id;
  
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

DROP TRIGGER IF EXISTS validate_student_profile_before_booking ON booking_requests;
CREATE TRIGGER validate_student_profile_before_booking
  BEFORE INSERT ON booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION validate_student_booking();

-- =====================================================
-- FIX INDEXES
-- =====================================================
DROP INDEX IF EXISTS one_pending_booking_per_user_property;
DROP INDEX IF EXISTS idx_booking_requests_user_id;

CREATE UNIQUE INDEX IF NOT EXISTS one_pending_booking_per_student_property
  ON booking_requests (student_id, property_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_booking_requests_student_id ON booking_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_booking_requests_owner_id ON booking_requests(owner_id);
CREATE INDEX IF NOT EXISTS idx_booking_requests_status ON booking_requests(status);
CREATE INDEX IF NOT EXISTS idx_booking_requests_property_id ON booking_requests(property_id);

-- =====================================================
-- FIX RLS POLICIES
-- =====================================================
-- Drop old policies that might use wrong column names
DROP POLICY IF EXISTS "Students can view their own booking requests" ON booking_requests;
DROP POLICY IF EXISTS "Owners can view booking requests for their properties" ON booking_requests;
DROP POLICY IF EXISTS "Students can create booking requests" ON booking_requests;
DROP POLICY IF EXISTS "Owners can update booking request status" ON booking_requests;

-- Create correct policies
CREATE POLICY "Students can view their own booking requests"
  ON booking_requests FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Owners can view booking requests for their properties"
  ON booking_requests FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Students can create booking requests"
  ON booking_requests FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Owners can update booking request status"
  ON booking_requests FOR UPDATE
  USING (auth.uid() = owner_id);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- ✅ Schema normalized to use student_id and owner_id
-- ✅ All triggers fixed
-- ✅ All indexes fixed
-- ✅ RLS policies fixed
-- =====================================================

