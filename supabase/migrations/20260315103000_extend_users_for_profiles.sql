-- Migration: Extend public.users for Phase 2 profile features

BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS display_name text;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_url text;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS timezone text;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

ALTER TABLE public.users
  ALTER COLUMN timezone SET DEFAULT 'UTC',
  ALTER COLUMN updated_at SET DEFAULT now();

UPDATE public.users
SET timezone = COALESCE(NULLIF(BTRIM(timezone), ''), 'UTC'),
    updated_at = COALESCE(updated_at, created_at, now())
WHERE timezone IS NULL
   OR BTRIM(timezone) = ''
   OR updated_at IS NULL;

ALTER TABLE public.users
  ALTER COLUMN timezone SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

COMMENT ON TABLE public.users IS 'Canonical Phase 2 profile aggregate owned by the user-profiles module.';
COMMENT ON COLUMN public.users.display_name IS 'User-editable display name shown in the application profile.';
COMMENT ON COLUMN public.users.avatar_url IS 'Optional avatar URL for the user profile.';
COMMENT ON COLUMN public.users.timezone IS 'Preferred IANA timezone identifier for the user profile.';
COMMENT ON COLUMN public.users.updated_at IS 'Last profile mutation timestamp maintained by a database trigger.';

CREATE OR REPLACE FUNCTION public.handle_public_users_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_public_users_updated_at'
      AND tgrelid = 'public.users'::regclass
  ) THEN
    CREATE TRIGGER trg_public_users_updated_at
      BEFORE UPDATE ON public.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_public_users_updated_at();
  END IF;
END $$;

COMMIT;
