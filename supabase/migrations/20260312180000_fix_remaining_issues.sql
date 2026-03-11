-- Migration: Fix remaining schema issues
-- 1. Fix CREATE POLICY IF NOT EXISTS (not supported in PostgreSQL)
-- 2. Fix composite FK unique constraint order (id, duel_id)
-- 3. Remove CHECK constraint with subquery

BEGIN;

-- 1. Fix RLS policies in 20260312130000_fix_schema_idempotency.sql
-- Topics policies
DROP POLICY IF EXISTS topics_select_policy ON public.topics;
DROP POLICY IF EXISTS topics_insert_policy ON public.topics;
DROP POLICY IF EXISTS topics_update_policy ON public.topics;
DROP POLICY IF EXISTS topics_delete_policy ON public.topics;

CREATE POLICY topics_select_policy ON public.topics FOR SELECT USING (true);
CREATE POLICY topics_insert_policy ON public.topics FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY topics_update_policy ON public.topics FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY topics_delete_policy ON public.topics FOR DELETE USING (auth.role() = 'service_role');

-- Duel_rounds policies
DROP POLICY IF EXISTS duel_rounds_select_policy ON public.duel_rounds;
DROP POLICY IF EXISTS duel_rounds_insert_policy ON public.duel_rounds;
DROP POLICY IF EXISTS duel_rounds_update_policy ON public.duel_rounds;
DROP POLICY IF EXISTS duel_rounds_delete_policy ON public.duel_rounds;

CREATE POLICY duel_rounds_select_policy ON public.duel_rounds FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY duel_rounds_insert_policy ON public.duel_rounds FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY duel_rounds_update_policy ON public.duel_rounds FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY duel_rounds_delete_policy ON public.duel_rounds FOR DELETE USING (auth.role() = 'service_role');

-- Jobs policies
DROP POLICY IF EXISTS jobs_select_policy ON public.jobs;
DROP POLICY IF EXISTS jobs_insert_policy ON public.jobs;
DROP POLICY IF EXISTS jobs_update_policy ON public.jobs;
DROP POLICY IF EXISTS jobs_delete_policy ON public.jobs;

CREATE POLICY jobs_select_policy ON public.jobs FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY jobs_insert_policy ON public.jobs FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY jobs_update_policy ON public.jobs FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY jobs_delete_policy ON public.jobs FOR DELETE USING (auth.role() = 'service_role');

-- 2. Fix composite FK - add UNIQUE on (id, duel_id) in correct order
-- Drop incorrect constraint if exists
ALTER TABLE public.duel_rounds DROP CONSTRAINT IF EXISTS duel_rounds_duel_id_id_unique;

-- Add correct unique constraint for composite FK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'duel_rounds_id_duel_id_unique'
      AND conrelid = 'public.duel_rounds'::regclass
  ) THEN
    ALTER TABLE public.duel_rounds 
      ADD CONSTRAINT duel_rounds_id_duel_id_unique UNIQUE (id, duel_id);
  END IF;
END $$;

-- 3. Remove CHECK constraint with subquery from resolve_copilot_review_findings.sql
ALTER TABLE public.duel_answers DROP CONSTRAINT IF EXISTS duel_answers_round_duel_match;

COMMIT;
