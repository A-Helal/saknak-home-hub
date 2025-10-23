-- Fix search path for functions - drop triggers first
DROP TRIGGER IF EXISTS set_booking_expiry_trigger ON public.booking_requests;
DROP TRIGGER IF EXISTS handle_booking_status_trigger ON public.booking_requests;

-- Drop and recreate functions with proper search_path
DROP FUNCTION IF EXISTS set_booking_expiry();
CREATE OR REPLACE FUNCTION set_booking_expiry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.expires_at := NEW.created_at + INTERVAL '1 hour';
  NEW.vodafone_number := '01012345678'; -- Replace with actual Vodafone Cash number
  NEW.deposit_amount := (SELECT price * 0.2 FROM properties WHERE id = NEW.property_id); -- 20% deposit
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS handle_booking_acceptance();
CREATE OR REPLACE FUNCTION handle_booking_acceptance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If booking is accepted and payment is confirmed, reserve the property
  IF NEW.status = 'accepted' AND NEW.payment_confirmed = true THEN
    UPDATE properties 
    SET status = 'reserved'
    WHERE id = NEW.property_id;
  END IF;
  
  -- If booking is rejected or expired, make property available again
  IF NEW.status IN ('rejected', 'expired') THEN
    UPDATE properties 
    SET status = 'available'
    WHERE id = NEW.property_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate triggers
CREATE TRIGGER set_booking_expiry_trigger
BEFORE INSERT ON public.booking_requests
FOR EACH ROW
EXECUTE FUNCTION set_booking_expiry();

CREATE TRIGGER handle_booking_status_trigger
AFTER UPDATE ON public.booking_requests
FOR EACH ROW
EXECUTE FUNCTION handle_booking_acceptance();