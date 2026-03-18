-- Migration: Update timezone validation to match service IANA regex
BEGIN;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_timezone_valid_check;

-- Add updated CHECK constraint matching the service-level IANA regex
-- NOTE:
-- This regex ensures format correctness but does not validate
-- against actual IANA timezone database. Use Intl.supportedValuesOf
-- where available for stricter validation.
-- Column is NOT NULL and regex covers 'UTC' as first alternative.
-- pattern: ^(UTC|[A-Za-z_]+(?:/[A-Za-z0-9._+-]+)+)$
ALTER TABLE public.users
ADD CONSTRAINT users_timezone_valid_check
CHECK (
    timezone ~ '^(UTC|[A-Za-z_]+(?:/[A-Za-z0-9._+-]+)+)$'
);

COMMENT ON CONSTRAINT users_timezone_valid_check ON public.users 
IS 'Ensures timezone values follow valid IANA timezone format (e.g., Asia/Jakarta, America/Argentina/Buenos_Aires)';

COMMIT;
