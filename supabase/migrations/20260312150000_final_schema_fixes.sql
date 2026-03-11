-- Migration: Final schema fixes
-- Fixes: add unique for composite FK, fix POLICY syntax, remove redundant indexes

BEGIN;

-- 1. Add UNIQUE constraint on duel_rounds(duel_id, id) for composite FK validity
-- The primary key is on (id), but we need (duel_id, id) for the composite FK reference

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'duel_rounds_duel_id_id_unique'
      AND conrelid = 'public.duel_rounds'::regclass
  ) THEN
    ALTER TABLE public.duel_rounds 
      ADD CONSTRAINT duel_rounds_duel_id_id_unique UNIQUE (duel_id, id);
  END IF;
END $$;

-- 2. Fix RLS policies - PostgreSQL doesn't support CREATE POLICY IF NOT EXISTS
-- Drop and recreate for jobs table

DROP POLICY IF EXISTS jobs_select_policy ON public.jobs;
DROP POLICY IF EXISTS jobs_insert_policy ON public.jobs;
DROP POLICY IF EXISTS jobs_update_policy ON public.jobs;
DROP POLICY IF EXISTS jobs_delete_policy ON public.jobs;

CREATE POLICY jobs_select_policy ON public.jobs
  FOR SELECT USING (auth.role() = 'service_role');

CREATE POLICY jobs_insert_policy ON public.jobs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY jobs_update_policy ON public.jobs
  FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY jobs_delete_policy ON public.jobs
  FOR DELETE USING (auth.role() = 'service_role');

-- Fix RLS policies for topics table

DROP POLICY IF EXISTS topics_select_policy ON public.topics;
DROP POLICY IF EXISTS topics_insert_policy ON public.topics;
DROP POLICY IF EXISTS topics_update_policy ON public.topics;
DROP POLICY IF EXISTS topics_delete_policy ON public.topics;

CREATE POLICY topics_select_policy ON public.topics
  FOR SELECT USING (true);

CREATE POLICY topics_insert_policy ON public.topics
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY topics_update_policy ON public.topics
  FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY topics_delete_policy ON public.topics
  FOR DELETE USING (auth.role() = 'service_role');

-- Fix RLS policies for duel_rounds table

DROP POLICY IF EXISTS duel_rounds_select_policy ON public.duel_rounds;
DROP POLICY IF EXISTS duel_rounds_insert_policy ON public.duel_rounds;
DROP POLICY IF EXISTS duel_rounds_update_policy ON public.duel_rounds;
DROP POLICY IF EXISTS duel_rounds_delete_policy ON public.duel_rounds;

CREATE POLICY duel_rounds_select_policy ON public.duel_rounds
  FOR SELECT USING (true);

CREATE POLICY duel_rounds_insert_policy ON public.duel_rounds
  FOR INSERT WITH CHECK (true);

CREATE POLICY duel_rounds_update_policy ON public.duel_rounds
  FOR UPDATE USING (true);

CREATE POLICY duel_rounds_delete_policy ON public.duel_rounds
  FOR DELETE USING (true);

-- 3. Remove redundant indexes already covered by UNIQUE constraints
-- idx_duel_rounds_duel_id: covered by UNIQUE (duel_id, round_number)
-- idx_duel_answers_round_id: covered by UNIQUE (round_id, player_id)
-- idx_subscriptions_user_id: covered by UNIQUE (user_id)

DROP INDEX IF EXISTS public.idx_duel_rounds_duel_id;
DROP INDEX IF EXISTS public.idx_duel_answers_round_id;
DROP INDEX IF EXISTS public.idx_subscriptions_user_id;

COMMIT;
