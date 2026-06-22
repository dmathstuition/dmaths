-- Add guardian email column so weekly digest emails can be sent to parents/guardians.
-- guardian_contact already holds a phone number; guardian_email is a separate opt-in field.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS guardian_email TEXT DEFAULT '';
