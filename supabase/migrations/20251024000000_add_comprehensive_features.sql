-- ============================================
-- COMPREHENSIVE FEATURES MIGRATION
-- ============================================
-- 1. Add student fields to profiles
-- 2. Add owner fields to profiles
-- 3. Update booking_requests with new fields
-- 4. Create notifications table
-- 5. Create ratings table
-- 6. Add triggers and functions
-- ============================================

-- ============================================
-- 1. STUDENT PROFILE FIELDS
-- ============================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS civil_id_url TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS area TEXT,
ADD COLUMN IF NOT EXISTS college TEXT,
ADD COLUMN IF NOT EXISTS level TEXT CHECK (level IN ('1','2','3','4','graduate')),
ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;

-- ============================================
-- 2. OWNER PROFILE FIELDS
-- ============================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS ownership_image_url TEXT;

-- Update properties table for owner address (already has latitude/longitude)
-- Address field already exists in properties table, just ensure it's there
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS address_details TEXT;

-- ============================================
-- 3. BOOKING REQUESTS UPDATES
-- ============================================
ALTER TABLE public.booking_requests
ADD COLUMN IF NOT EXISTS payment_option TEXT CHECK (payment_option IN ('deposit', 'full_insurance')),
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'none' CHECK (payment_status IN ('none', 'confirmed')),
ADD COLUMN IF NOT EXISTS rent_due_date DATE,
ADD COLUMN IF NOT EXISTS rent_paid_date DATE;

-- Update status to include 'denied' and 'expired'
ALTER TABLE public.booking_requests 
DROP CONSTRAINT IF EXISTS booking_requests_status_check;

ALTER TABLE public.booking_requests
ADD CONSTRAINT booking_requests_status_check 
CHECK (status IN ('pending', 'accepted', 'rejected', 'denied', 'expired'));

-- ============================================
-- 4. NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can insert notifications (for triggers)
CREATE POLICY "Service role can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Create index for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- ============================================
-- 5. RATINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  to_user UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  booking_id UUID REFERENCES public.booking_requests(id) ON DELETE CASCADE NOT NULL,
  stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(from_user, to_user, booking_id)
);

-- Enable RLS on ratings
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ratings
CREATE POLICY "Users can view ratings about them or by them"
  ON public.ratings FOR SELECT
  USING (auth.uid() = from_user OR auth.uid() = to_user);

CREATE POLICY "Users can insert their own ratings"
  ON public.ratings FOR INSERT
  WITH CHECK (auth.uid() = from_user);

CREATE POLICY "Users can update their own ratings"
  ON public.ratings FOR UPDATE
  USING (auth.uid() = from_user);

-- Create indexes for ratings
CREATE INDEX IF NOT EXISTS idx_ratings_from_user ON public.ratings(from_user);
CREATE INDEX IF NOT EXISTS idx_ratings_to_user ON public.ratings(to_user);
CREATE INDEX IF NOT EXISTS idx_ratings_booking_id ON public.ratings(booking_id);

-- ============================================
-- 6. FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to update student score when rent is paid on time
CREATE OR REPLACE FUNCTION update_student_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if rent was paid within 5 days before due date
  IF NEW.rent_paid_date IS NOT NULL 
     AND OLD.rent_paid_date IS NULL
     AND NEW.rent_paid_date <= NEW.rent_due_date
     AND NEW.rent_paid_date >= NEW.rent_due_date - INTERVAL '5 days' THEN
    
    -- Add 10 points to student score
    UPDATE profiles 
    SET score = score + 10 
    WHERE id = NEW.student_id;
    
    -- Send notification to student
    INSERT INTO notifications (user_id, title, body)
    VALUES (
      NEW.student_id,
      'Score Increased!',
      'You earned +10 points for paying rent on time!'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS add_score_on_payment ON public.booking_requests;

-- Create trigger for rent payment scoring
CREATE TRIGGER add_score_on_payment
AFTER UPDATE ON public.booking_requests
FOR EACH ROW
WHEN (OLD.rent_paid_date IS DISTINCT FROM NEW.rent_paid_date)
EXECUTE FUNCTION update_student_score();

-- Function to notify booking status changes
CREATE OR REPLACE FUNCTION notify_booking_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  msg TEXT;
  notification_title TEXT;
BEGIN
  -- Only notify on status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'accepted' THEN
      notification_title := 'Booking Accepted';
      msg := 'Your booking request was accepted by the owner.';
    ELSIF NEW.status IN ('rejected', 'denied') THEN
      notification_title := 'Booking Denied';
      msg := 'Your booking request was denied by the owner.';
    ELSIF NEW.status = 'expired' THEN
      notification_title := 'Booking Expired';
      msg := 'Your booking request has expired.';
    ELSE
      RETURN NEW;
    END IF;
    
    -- Insert notification for student
    INSERT INTO notifications (user_id, title, body)
    VALUES (NEW.student_id, notification_title, msg);
    
    -- If accepted, deny all other pending bookings for same property
    IF NEW.status = 'accepted' THEN
      UPDATE booking_requests
      SET status = 'denied'
      WHERE property_id = NEW.property_id
        AND id != NEW.id
        AND status = 'pending';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS booking_status_notification ON public.booking_requests;

-- Create trigger for booking status notifications
CREATE TRIGGER booking_status_notification
AFTER UPDATE ON public.booking_requests
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION notify_booking_status();

-- Function to validate student profile completeness before booking
CREATE OR REPLACE FUNCTION validate_student_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  student_profile RECORD;
BEGIN
  -- Get student profile
  SELECT civil_id_url, city, area, college, level
  INTO student_profile
  FROM profiles
  WHERE id = NEW.student_id;
  
  -- Validate all required fields are filled
  IF student_profile.civil_id_url IS NULL OR
     student_profile.city IS NULL OR
     student_profile.area IS NULL OR
     student_profile.college IS NULL OR
     student_profile.level IS NULL THEN
    RAISE EXCEPTION 'Student profile incomplete. Please complete your profile before booking.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS validate_student_profile_before_booking ON public.booking_requests;

-- Create trigger to validate student profile
CREATE TRIGGER validate_student_profile_before_booking
BEFORE INSERT ON public.booking_requests
FOR EACH ROW
EXECUTE FUNCTION validate_student_booking();

-- ============================================
-- 7. STORAGE BUCKET RLS POLICIES
-- ============================================
-- Note: Storage buckets need to be created via Supabase dashboard or CLI
-- Policies can be set in the dashboard under Storage > Policies

-- Comments for storage bucket creation:
-- Bucket: civil_ids
--   - Max file size: 5MB
--   - Allowed MIME types: image/*, application/pdf
--   - Public: false

-- Bucket: ownership_images
--   - Max file size: 5MB
--   - Allowed MIME types: image/*
--   - Public: false

-- Bucket: payment_proofs
--   - Max file size: 5MB
--   - Allowed MIME types: image/*, application/pdf
--   - Public: false

-- ============================================
-- 8. ADDITIONAL INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON public.profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_profiles_score ON public.profiles(score DESC);
CREATE INDEX IF NOT EXISTS idx_booking_requests_status ON public.booking_requests(status);
CREATE INDEX IF NOT EXISTS idx_booking_requests_rent_due_date ON public.booking_requests(rent_due_date);

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
