-- =====================================================
-- PREVENT OWNER SELF-BOOKING
-- =====================================================
-- Add database constraint to prevent owners from booking
-- their own properties
-- =====================================================

-- Add check constraint to prevent owner from booking their own property
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
  IF NEW.user_id = v_property_owner_id THEN
    RAISE EXCEPTION 'لا يمكن للمالك حجز عقاره الخاص'
      USING ERRCODE = 'check_violation';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS prevent_owner_self_booking_trigger ON booking_requests;

-- Create trigger to prevent owner self-booking
CREATE TRIGGER prevent_owner_self_booking_trigger
  BEFORE INSERT ON booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION prevent_owner_self_booking();

-- =====================================================
-- ENSURE IMAGES ARRAY IS NEVER NULL
-- =====================================================
-- Make sure images column always returns an array
-- even if it's empty
-- =====================================================

-- Add trigger to ensure images is always an array
CREATE OR REPLACE FUNCTION ensure_images_array()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.images IS NULL THEN
    NEW.images := '{}';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS ensure_images_array_trigger ON properties;

-- Create trigger for new inserts
CREATE TRIGGER ensure_images_array_trigger
  BEFORE INSERT OR UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION ensure_images_array();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- ✅ Owners cannot book their own properties (database constraint)
-- ✅ Images array is always properly initialized
-- =====================================================

