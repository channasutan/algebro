-- Migration: Restrict duel_rounds RLS to service_role
-- Fix: Remove permissive policies, restrict all access to service_role only

BEGIN;

-- Drop existing permissive policies
DROP POLICY IF EXISTS duel_rounds_select_policy ON public.duel_rounds;
DROP POLICY IF EXISTS duel_rounds_insert_policy ON public.duel_rounds;
DROP POLICY IF EXISTS duel_rounds_update_policy ON public.duel_rounds;
DROP POLICY IF EXISTS duel_rounds_delete_policy ON public.duel_rounds;

-- Recreate with service_role only access
CREATE POLICY duel_rounds_select_policy ON public.duel_rounds
  FOR SELECT USING (auth.role() = 'service_role');

CREATE POLICY duel_rounds_insert_policy ON public.duel_rounds
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY duel_rounds_update_policy ON public.duel_rounds
  FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY duel_rounds_delete_policy ON public.duel_rounds
  FOR DELETE USING (auth.role() = 'service_role');

COMMIT;
