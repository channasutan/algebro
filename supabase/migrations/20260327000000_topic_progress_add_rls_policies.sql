-- Migration: Add RLS policies to topic_progress
-- Table already exists, RLS already enabled.
-- This migration adds SELECT and UPDATE policies only.
-- Idempotent: safe to run multiple times.

-- SELECT: user can only read their own rows
DROP POLICY IF EXISTS "Users can view own topic progress" ON public.topic_progress;
CREATE POLICY "Users can view own topic progress"
  ON public.topic_progress FOR SELECT
  USING (user_id = auth.uid());

-- UPDATE: user can only update their own rows  
DROP POLICY IF EXISTS "Users can update own topic progress" ON public.topic_progress;
CREATE POLICY "Users can update own topic progress"
  ON public.topic_progress FOR UPDATE
  USING (user_id = auth.uid());

-- No INSERT policy for authenticated/anon role.
-- All INSERTs must go through service-role client in repository layer.
-- No DELETE policy — deletes only via CASCADE or service-role.
