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
-- ============================================================
CREATE OR REPLACE FUNCTION create_attempt_with_step(
  p_session_id  uuid,
  p_problem_id  uuid,
  p_user_id     uuid,
  p_step_index  int,
  p_step_latex  text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_attempt      attempts%ROWTYPE;
  v_step         solution_steps%ROWTYPE;
BEGIN
  INSERT INTO attempts (session_id, problem_id, user_id)
  VALUES (p_session_id, p_problem_id, p_user_id)
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
