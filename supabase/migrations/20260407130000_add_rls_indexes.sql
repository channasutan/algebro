-- RLS performance indexes: prevent full table scans on every policy evaluation
-- These are critical for correctness under load (without them, RLS is O(n) per request)

CREATE INDEX IF NOT EXISTS idx_attempts_user_id ON attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_id ON practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_solution_steps_user_id ON solution_steps(user_id);
CREATE INDEX IF NOT EXISTS idx_materials_user_id ON materials(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_hint_usage_user_id ON ai_hint_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_id ON ai_usage_logs(user_id);

-- Also index foreign keys used in JOINs with RLS-protected tables
CREATE INDEX IF NOT EXISTS idx_solution_steps_attempt_id ON solution_steps(attempt_id);
CREATE INDEX IF NOT EXISTS idx_attempts_session_id ON attempts(practice_session_id);
