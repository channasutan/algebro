-- ============================================================
-- ALE-150: Practice Loop Idempotency & Transactional Writes
-- ============================================================
-- Deploy Safety: Deduplicate existing active sessions before creating unique indexes.
-- If production has duplicate active sessions, mark older ones as completed to preserve history.
-- ============================================================

DO $$
BEGIN
  -- Deduplicate active sessions with non-null topic_id
  -- Keep the most recent session per (user_id, topic_id), mark older as completed
  UPDATE practice_sessions
  SET completed_at = NOW()
  WHERE id IN (
    SELECT ps.id
    FROM practice_sessions ps
    INNER JOIN (
      SELECT user_id, topic_id, MAX(started_at) as max_started_at
      FROM practice_sessions
      WHERE completed_at IS NULL AND topic_id IS NOT NULL
      GROUP BY user_id, topic_id
      HAVING COUNT(*) > 1
    ) dup ON ps.user_id = dup.user_id AND ps.topic_id = dup.topic_id
    WHERE ps.completed_at IS NULL
      AND ps.started_at < dup.max_started_at
  );

  -- Deduplicate active sessions with null topic_id (free practice)
  -- Keep the most recent session per user_id, mark older as completed
  UPDATE practice_sessions
  SET completed_at = NOW()
  WHERE id IN (
    SELECT ps.id
    FROM practice_sessions ps
    INNER JOIN (
      SELECT user_id, MAX(started_at) as max_started_at
      FROM practice_sessions
      WHERE completed_at IS NULL AND topic_id IS NULL
      GROUP BY user_id
      HAVING COUNT(*) > 1
    ) dup ON ps.user_id = dup.user_id
    WHERE ps.completed_at IS NULL
      AND ps.topic_id IS NULL
      AND ps.started_at < dup.max_started_at
  );
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
