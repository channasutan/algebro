-- ============================================================
-- ALE-150: Practice Loop Idempotency & Transactional Writes
-- ============================================================
-- Deploy Safety: Deduplicate existing active sessions before creating unique indexes.
-- If production has duplicate active sessions, mark older ones as completed to preserve history.
-- ============================================================

DO $$
BEGIN
  -- Deduplicate active sessions with non-null topic_id
  -- Keep exactly one deterministic survivor per (user_id, topic_id)
  WITH ranked AS (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, topic_id
        ORDER BY started_at DESC, id ASC
      ) AS rn
    FROM practice_sessions
    WHERE completed_at IS NULL
      AND topic_id IS NOT NULL
  )
  UPDATE practice_sessions
  SET completed_at = NOW()
  WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

  -- Deduplicate active sessions with null topic_id (free practice)
  -- Keep exactly one deterministic survivor per user_id
  WITH ranked AS (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id
        ORDER BY started_at DESC, id ASC
      ) AS rn
    FROM practice_sessions
    WHERE completed_at IS NULL
      AND topic_id IS NULL
  )
  UPDATE practice_sessions
  SET completed_at = NOW()
  WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
END $$;

-- ============================================================
-- ALE-150 Fix 1: Idempotency — partial unique index on active sessions
-- Prevents duplicate active sessions for the same (user_id, topic_id).
-- NULL topic_id is handled by the unique index on (user_id) where topic_id IS NULL.
-- ============================================================
CREATE UNIQUE INDEX practice_sessions_active_topic_unique
  ON practice_sessions (user_id, topic_id)
  WHERE completed_at IS NULL AND topic_id IS NOT NULL;

CREATE UNIQUE INDEX practice_sessions_active_null_topic_unique
  ON practice_sessions (user_id)
  WHERE completed_at IS NULL AND topic_id IS NULL;

-- ============================================================
-- ALE-150 Fix 2: Transactional RPC — create attempt + first step atomically
-- If the step insert fails, the attempt insert is rolled back.
-- SECURITY INVOKER ensures RLS policies remain enforced.
-- SET search_path prevents search_path hijacking attacks.
-- ============================================================
CREATE OR REPLACE FUNCTION create_attempt_with_step(
  p_session_id  uuid,
  p_problem_id  uuid,
  p_step_index  int,
  p_step_latex  text
)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_attempt      attempts%ROWTYPE;
  v_step         solution_steps%ROWTYPE;
BEGIN
  INSERT INTO attempts (session_id, problem_id, user_id)
  VALUES (p_session_id, p_problem_id, auth.uid())
  RETURNING * INTO v_attempt;

  INSERT INTO solution_steps (attempt_id, step_index, step_latex)
  VALUES (v_attempt.id, p_step_index, p_step_latex)
  RETURNING * INTO v_step;

  RETURN json_build_object(
    'attempt', row_to_json(v_attempt),
    'step',    row_to_json(v_step)
  );
END;
$$;
