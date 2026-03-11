-- Migration: Fix schema issues from baseline
-- Fixes: timezone usage, redundant indexes, add topics table, add FK references

BEGIN;

-- 1. Replace timezone('utc', now()) with now() in relevant tables
-- This is done via ALTER DEFAULT VALUE

ALTER TABLE public.users ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.problem_templates ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.problems ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.problem_pool ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.practice_sessions ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.attempts ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.solution_steps ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.topic_progress ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.ai_hint_usage ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.materials ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.material_topics ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.xp_events ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.duels ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.duel_rounds ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.duel_answers ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.subscriptions ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.payments ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.jobs ALTER COLUMN created_at SET DEFAULT now();

-- 2. Remove redundant indexes (unique constraints already create indexes)

DROP INDEX IF EXISTS public.idx_duel_rounds_duel_id;
DROP INDEX IF EXISTS public.idx_duel_answers_round_id;
DROP INDEX IF EXISTS public.idx_subscriptions_user_id;

-- Recreate indexes that are needed but were dropped
-- These are for performance, not redundancy (not covered by unique constraints)
CREATE INDEX idx_duel_rounds_duel_id ON public.duel_rounds (duel_id);
CREATE INDEX idx_duel_answers_round_id ON public.duel_answers (round_id);
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions (user_id);

-- 3. Create topics table

CREATE TABLE IF NOT EXISTS public.topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  parent_id uuid REFERENCES public.topics (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add unique constraint on name
ALTER TABLE public.topics ADD CONSTRAINT topics_name_unique UNIQUE (name);

-- Add indexes for topics
CREATE INDEX idx_topics_parent_id ON public.topics (parent_id);

-- 4. Add foreign key references from topic_id to topics(id)

-- problem_templates doesn't have topic_id, but problems does
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

COMMIT;
