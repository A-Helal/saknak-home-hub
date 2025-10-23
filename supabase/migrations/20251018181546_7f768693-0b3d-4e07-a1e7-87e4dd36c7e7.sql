-- Add payment and expiry fields to booking_requests
ALTER TABLE public.booking_requests
ADD COLUMN payment_confirmed BOOLEAN DEFAULT false,
ADD COLUMN vodafone_number TEXT,
ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN deposit_amount NUMERIC;

-- Add status field to properties
ALTER TABLE public.properties
ADD COLUMN status TEXT DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'unavailable'));

-- Create function to automatically set expiry time (1 hour from creation)
CREATE OR REPLACE FUNCTION set_booking_expiry()
RETURNS TRIGGER AS $$
BEGIN
  NEW.expires_at := NEW.created_at + INTERVAL '1 hour';
  NEW.vodafone_number := '01012345678'; -- Replace with actual Vodafone Cash number
  NEW.deposit_amount := (SELECT price * 0.2 FROM properties WHERE id = NEW.property_id); -- 20% deposit
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to set expiry on new bookings
CREATE TRIGGER set_booking_expiry_trigger
BEFORE INSERT ON public.booking_requests
FOR EACH ROW
EXECUTE FUNCTION set_booking_expiry();

-- Create function to handle booking acceptance and property reservation
CREATE OR REPLACE FUNCTION handle_booking_acceptance()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger for booking status changes
CREATE TRIGGER handle_booking_status_trigger
AFTER UPDATE ON public.booking_requests
FOR EACH ROW
EXECUTE FUNCTION handle_booking_acceptance();