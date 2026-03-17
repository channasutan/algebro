-- Migration: Fix timezone validation for public.users table (user profiles)
-- Updates CHECK constraint to match service-layer validation

BEGIN;

-- Drop the existing constraint
ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS users_timezone_valid_check;

-- Add updated CHECK constraint matching service validation
-- Supports: "UTC" or IANA format like "America/Argentina/Buenos_Aires"
ALTER TABLE public.users
ADD CONSTRAINT users_timezone_valid_check
CHECK (
    timezone IS NULL 
    OR timezone = 'UTC' 
    OR timezone ~ '^[A-Za-z_]+(?:/[A-Za-z0-9._+-]+)+$'
);

-- Add comment to document the constraint
COMMENT ON CONSTRAINT users_timezone_valid_check ON public.users 
IS 'Ensures timezone values are "UTC" or valid IANA format (e.g., America/Argentina/Buenos_Aires, Etc/GMT+1)';

COMMIT;
