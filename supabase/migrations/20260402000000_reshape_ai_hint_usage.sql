BEGIN;

-- Drop the existing ai_hint_usage table (no production data yet)
DROP TABLE IF EXISTS public.ai_hint_usage;

-- Recreate with correct schema (per-user, per-problem counter)
CREATE TABLE IF NOT EXISTS public.ai_hint_usage (
  user_id    uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  problem_id uuid        NOT NULL REFERENCES problems(id)    ON DELETE RESTRICT,
  hint_count integer     NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, problem_id)
);

CREATE INDEX IF NOT EXISTS ai_hint_usage_user_idx ON public.ai_hint_usage (user_id);

-- Database function for atomic hint count increment
-- This prevents read-then-write race conditions
CREATE OR REPLACE FUNCTION increment_ai_hint_usage(
  p_user_id uuid,
  p_problem_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO ai_hint_usage (user_id, problem_id, hint_count)
  VALUES (p_user_id, p_problem_id, 1)
  ON CONFLICT (user_id, problem_id)
  DO UPDATE SET hint_count = ai_hint_usage.hint_count + 1;
END;
$$;

COMMIT;