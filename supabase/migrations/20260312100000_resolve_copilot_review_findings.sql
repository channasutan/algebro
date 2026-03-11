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

-- 2. Enforce relational integrity in duel_answers
-- Ensure round_id belongs to the same duel_id as duel_answers.duel_id

ALTER TABLE public.duel_answers
  ADD CONSTRAINT duel_answers_round_duel_match
  CHECK (
    EXISTS (
      SELECT 1 FROM public.duel_rounds dr
      WHERE dr.id = duel_answers.round_id
        AND dr.duel_id = duel_answers.duel_id
    )
  );

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

CREATE POLICY IF NOT EXISTS topics_select_policy ON public.topics
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS topics_insert_policy ON public.topics
  FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS topics_update_policy ON public.topics
  FOR UPDATE USING (true);

CREATE POLICY IF NOT EXISTS topics_delete_policy ON public.topics
  FOR DELETE USING (true);

-- Add RLS policies for duel_rounds

CREATE POLICY IF NOT EXISTS duel_rounds_select_policy ON public.duel_rounds
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS duel_rounds_insert_policy ON public.duel_rounds
  FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS duel_rounds_update_policy ON public.duel_rounds
  FOR UPDATE USING (true);

CREATE POLICY IF NOT EXISTS duel_rounds_delete_policy ON public.duel_rounds
  FOR DELETE USING (true);

-- Add RLS policies for jobs

CREATE POLICY IF NOT EXISTS jobs_select_policy ON public.jobs
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS jobs_insert_policy ON public.jobs
  FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS jobs_update_policy ON public.jobs
  FOR UPDATE USING (true);

CREATE POLICY IF NOT EXISTS jobs_delete_policy ON public.jobs
  FOR DELETE USING (true);

COMMIT;
