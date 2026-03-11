-- Migration: Fix schema issues from previous migrations
-- Fixes: topics table idempotency, remove duplicate constraints, ensure IF NOT EXISTS

BEGIN;

-- 1. Fix topics table - ensure it exists without dropping (idempotent)
-- Create topics table if not exists (with proper constraints guarded)

CREATE TABLE IF NOT EXISTS public.topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Add foreign keys from topic_id to topics(id) - guard with IF NOT EXISTS

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'problems_topic_id_fkey'
  ) THEN
    ALTER TABLE public.problems 
      ADD CONSTRAINT problems_topic_id_fkey 
      FOREIGN KEY (topic_id) REFERENCES public.topics (id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'problem_pool_topic_id_fkey'
  ) THEN
    ALTER TABLE public.problem_pool 
      ADD CONSTRAINT problem_pool_topic_id_fkey 
      FOREIGN KEY (topic_id) REFERENCES public.topics (id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'practice_sessions_topic_id_fkey'
  ) THEN
    ALTER TABLE public.practice_sessions 
      ADD CONSTRAINT practice_sessions_topic_id_fkey 
      FOREIGN KEY (topic_id) REFERENCES public.topics (id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'duels_topic_id_fkey'
  ) THEN
    ALTER TABLE public.duels 
      ADD CONSTRAINT duels_topic_id_fkey 
      FOREIGN KEY (topic_id) REFERENCES public.topics (id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'topic_progress_topic_id_fkey'
  ) THEN
    ALTER TABLE public.topic_progress 
      ADD CONSTRAINT topic_progress_topic_id_fkey 
      FOREIGN KEY (topic_id) REFERENCES public.topics (id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'material_topics_topic_id_fkey'
  ) THEN
    ALTER TABLE public.material_topics 
      ADD CONSTRAINT material_topics_topic_id_fkey 
      FOREIGN KEY (topic_id) REFERENCES public.topics (id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. Replace CHECK constraint with composite FK (fix invalid subquery)
-- Drop the CHECK constraint if it exists

ALTER TABLE public.duel_answers DROP CONSTRAINT IF EXISTS duel_answers_round_duel_match;

-- Add composite foreign key using pg_constraint guard
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'duel_answers_round_duel_fkey'
  ) THEN
    ALTER TABLE public.duel_answers
      ADD CONSTRAINT duel_answers_round_duel_fkey
      FOREIGN KEY (round_id, duel_id)
      REFERENCES public.duel_rounds (id, duel_id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- 4. Add indexes using IF NOT EXISTS for idempotency
-- topic_id indexes
CREATE INDEX IF NOT EXISTS idx_problems_topic_id ON public.problems (topic_id);
CREATE INDEX IF NOT EXISTS idx_problem_pool_topic_id ON public.problem_pool (topic_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_topic_id ON public.practice_sessions (topic_id);
CREATE INDEX IF NOT EXISTS idx_duels_topic_id ON public.duels (topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_progress_topic_id ON public.topic_progress (topic_id);
CREATE INDEX IF NOT EXISTS idx_material_topics_topic_id ON public.material_topics (topic_id);

-- Other performance indexes
CREATE INDEX IF NOT EXISTS idx_duel_rounds_duel_id ON public.duel_rounds (duel_id);
CREATE INDEX IF NOT EXISTS idx_duel_answers_round_id ON public.duel_answers (round_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions (user_id);

-- 5. Enable RLS on new tables (guard with check)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE tablename = 'duel_rounds' AND rowsecurity = true
  ) THEN
    ALTER TABLE public.duel_rounds ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE tablename = 'topics' AND rowsecurity = true
  ) THEN
    ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE tablename = 'jobs' AND rowsecurity = true
  ) THEN
    ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- 6. Add RLS policies with IF NOT EXISTS for topics

CREATE POLICY IF NOT EXISTS topics_select_policy ON public.topics FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS topics_insert_policy ON public.topics FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS topics_update_policy ON public.topics FOR UPDATE USING (true);
CREATE POLICY IF NOT EXISTS topics_delete_policy ON public.topics FOR DELETE USING (true);

-- RLS policies for duel_rounds

CREATE POLICY IF NOT EXISTS duel_rounds_select_policy ON public.duel_rounds FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS duel_rounds_insert_policy ON public.duel_rounds FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS duel_rounds_update_policy ON public.duel_rounds FOR UPDATE USING (true);
CREATE POLICY IF NOT EXISTS duel_rounds_delete_policy ON public.duel_rounds FOR DELETE USING (true);

-- RLS policies for jobs

CREATE POLICY IF NOT EXISTS jobs_select_policy ON public.jobs FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS jobs_insert_policy ON public.jobs FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS jobs_update_policy ON public.jobs FOR UPDATE USING (true);
CREATE POLICY IF NOT EXISTS jobs_delete_policy ON public.jobs FOR DELETE USING (true);

COMMIT;
