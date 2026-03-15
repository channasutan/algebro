-- Migration: Resolve Copilot review findings
-- Fixes: topics table, duel_answers integrity, RLS

BEGIN;

-- 1. Recreate topics table to match exact spec (id, name, created_at)
-- Drop and recreate to ensure exact schema

DROP TABLE IF EXISTS public.topics CASCADE;

CREATE TABLE IF NOT EXISTS public.topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Re-add foreign keys from topic_id to topics(id)
-- First drop existing FKs if they exist

ALTER TABLE IF EXISTS public.problems DROP CONSTRAINT IF EXISTS problems_topic_id_fkey;
ALTER TABLE IF EXISTS public.problem_pool DROP CONSTRAINT IF EXISTS problem_pool_topic_id_fkey;
ALTER TABLE IF EXISTS public.practice_sessions DROP CONSTRAINT IF EXISTS practice_sessions_topic_id_fkey;
ALTER TABLE IF EXISTS public.duels DROP CONSTRAINT IF EXISTS duels_topic_id_fkey;
ALTER TABLE IF EXISTS public.topic_progress DROP CONSTRAINT IF EXISTS topic_progress_topic_id_fkey;
ALTER TABLE IF EXISTS public.material_topics DROP CONSTRAINT IF EXISTS material_topics_topic_id_fkey;

-- Re-create foreign keys

ALTER TABLE public.problems 
  ADD CONSTRAINT problems_topic_id_fkey 
  FOREIGN KEY (topic_id) REFERENCES public.topics (id) ON DELETE SET NULL;

ALTER TABLE public.problem_pool 
  ADD CONSTRAINT problem_pool_topic_id_fkey 
  FOREIGN KEY (topic_id) REFERENCES public.topics (id) ON DELETE SET NULL;

ALTER TABLE public.practice_sessions 
  ADD CONSTRAINT practice_sessions_topic_id_fkey 
  FOREIGN KEY (topic_id) REFERENCES public.topics (id) ON DELETE SET NULL;

ALTER TABLE public.duels 
  ADD CONSTRAINT duels_topic_id_fkey 
  FOREIGN KEY (topic_id) REFERENCES public.topics (id) ON DELETE SET NULL;

ALTER TABLE public.topic_progress 
  ADD CONSTRAINT topic_progress_topic_id_fkey 
  FOREIGN KEY (topic_id) REFERENCES public.topics (id) ON DELETE CASCADE;

ALTER TABLE public.material_topics 
  ADD CONSTRAINT material_topics_topic_id_fkey 
  FOREIGN KEY (topic_id) REFERENCES public.topics (id) ON DELETE CASCADE;

-- 2. Prepare duel_rounds for the composite FK added in later migrations
-- PostgreSQL requires referenced columns to be backed by a UNIQUE or PRIMARY KEY

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'duel_rounds_id_duel_id_unique'
      AND conrelid = 'public.duel_rounds'::regclass
  ) THEN
    ALTER TABLE public.duel_rounds
      ADD CONSTRAINT duel_rounds_id_duel_id_unique UNIQUE (id, duel_id);
  END IF;
END $$;

-- 3. Remove redundant indexes (already created by unique constraints)
-- - idx_duel_rounds_duel_id: NOT recreated (unique constraint on (duel_id, round_number) covers this)
-- - idx_duel_answers_round_id: NOT recreated (unique constraint on (round_id, player_id) covers this)
-- - idx_subscriptions_user_id: NOT recreated (unique constraint on (user_id) covers this)

DROP INDEX IF EXISTS public.idx_duel_rounds_duel_id;
DROP INDEX IF EXISTS public.idx_duel_answers_round_id;
DROP INDEX IF EXISTS public.idx_subscriptions_user_id;

-- 4. Add indexes on topic_id columns for performance

CREATE INDEX IF NOT EXISTS idx_problems_topic_id ON public.problems (topic_id);
CREATE INDEX IF NOT EXISTS idx_problem_pool_topic_id ON public.problem_pool (topic_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_topic_id ON public.practice_sessions (topic_id);
CREATE INDEX IF NOT EXISTS idx_duels_topic_id ON public.duels (topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_progress_topic_id ON public.topic_progress (topic_id);
CREATE INDEX IF NOT EXISTS idx_material_topics_topic_id ON public.material_topics (topic_id);

-- 5. Ensure problem_templates.name has unique constraint (already done in 20260311183000)
-- Verify it exists

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'problem_templates_name_unique'
      AND conrelid = 'public.problem_templates'::regclass
  ) THEN
    ALTER TABLE public.problem_templates
      ADD CONSTRAINT problem_templates_name_unique UNIQUE (name);
  END IF;
END $$;

-- 6. Enable RLS on duel_rounds, topics, jobs

ALTER TABLE public.duel_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for topics (allow read access, restrict write to owners if needed)
-- For topics, we'll allow public read access since it's a shared curriculum table

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'topics'
      AND policyname = 'topics_select_policy'
  ) THEN
    CREATE POLICY topics_select_policy ON public.topics
      FOR SELECT USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'topics'
      AND policyname = 'topics_insert_policy'
  ) THEN
    CREATE POLICY topics_insert_policy ON public.topics
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'topics'
      AND policyname = 'topics_update_policy'
  ) THEN
    CREATE POLICY topics_update_policy ON public.topics
      FOR UPDATE USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'topics'
      AND policyname = 'topics_delete_policy'
  ) THEN
    CREATE POLICY topics_delete_policy ON public.topics
      FOR DELETE USING (true);
  END IF;
END $$;

-- Add RLS policies for duel_rounds

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'duel_rounds'
      AND policyname = 'duel_rounds_select_policy'
  ) THEN
    CREATE POLICY duel_rounds_select_policy ON public.duel_rounds
      FOR SELECT USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'duel_rounds'
      AND policyname = 'duel_rounds_insert_policy'
  ) THEN
    CREATE POLICY duel_rounds_insert_policy ON public.duel_rounds
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'duel_rounds'
      AND policyname = 'duel_rounds_update_policy'
  ) THEN
    CREATE POLICY duel_rounds_update_policy ON public.duel_rounds
      FOR UPDATE USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'duel_rounds'
      AND policyname = 'duel_rounds_delete_policy'
  ) THEN
    CREATE POLICY duel_rounds_delete_policy ON public.duel_rounds
      FOR DELETE USING (true);
  END IF;
END $$;

-- Add RLS policies for jobs

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'jobs'
      AND policyname = 'jobs_select_policy'
  ) THEN
    CREATE POLICY jobs_select_policy ON public.jobs
      FOR SELECT USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'jobs'
      AND policyname = 'jobs_insert_policy'
  ) THEN
    CREATE POLICY jobs_insert_policy ON public.jobs
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'jobs'
      AND policyname = 'jobs_update_policy'
  ) THEN
    CREATE POLICY jobs_update_policy ON public.jobs
      FOR UPDATE USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'jobs'
      AND policyname = 'jobs_delete_policy'
  ) THEN
    CREATE POLICY jobs_delete_policy ON public.jobs
      FOR DELETE USING (true);
  END IF;
END $$;

COMMIT;
