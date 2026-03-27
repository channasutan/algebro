-- Migration: Add timezone validation to public.users

BEGIN;

-- Step 1: Normalize invalid or empty timezone values to 'UTC'
-- This ensures the CHECK constraint can be applied without breaking existing rows
UPDATE public.users
SET timezone = 'UTC'
WHERE timezone IS NULL
   OR BTRIM(timezone) = ''
   OR timezone !~ '^[A-Za-z]+(?:[-][A-Za-z]+)*/[A-Za-z]+(?:[-][A-Za-z]+)*$';

-- Step 2: Add CHECK constraint for valid IANA timezone format
-- The constraint uses a regex that matches IANA timezone format:
-- - Must contain a region/city pair separated by '/'
-- - Each part can contain letters and optional hyphens
-- Examples: Asia/Jakarta, Europe/Berlin, America/New_York
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_timezone_valid_check'
    AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
    ADD CONSTRAINT users_timezone_valid_check
    CHECK (
        timezone IS NULL
        OR timezone = 'UTC'
        OR timezone ~ '^[A-Za-z]+(?:[-][A-Za-z]+)*/[A-Za-z]+(?:[-][A-Za-z]+)*$'
    );
  END IF;
END $$;

-- Add comment to document the constraint
COMMENT ON CONSTRAINT users_timezone_valid_check ON public.users 
IS 'Ensures timezone values follow valid IANA timezone format (e.g., Asia/Jakarta, Europe/Berlin)';

COMMIT;
