-- Migration: Add RLS policies for public.users
-- Secures the profile table while allowing users to read, update, and insert their own rows,
-- and allowing the service_role to bootstrap profiles on auth events.

BEGIN;

-- Ensure RLS is enabled on the public.users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;

-- 1. Read Policy: Users can only read their own profile
DROP POLICY IF EXISTS users_read_own_profile ON public.users;
CREATE POLICY users_read_own_profile ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- 2. Insert Policy: Users can insert their own profile, and service_role can bootstrap profiles
DROP POLICY IF EXISTS users_insert_own_profile ON public.users;
-- server-side profile creation is triggered by the auth_user_registered event consumer
CREATE POLICY users_insert_own_profile ON public.users
  FOR INSERT
  WITH CHECK (
    auth.uid() = id
    OR auth.role() = 'service_role'
  );

-- 3. Update Policy: Users can update their own profile
DROP POLICY IF EXISTS users_update_own_profile ON public.users;
CREATE POLICY users_update_own_profile ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

COMMIT;
